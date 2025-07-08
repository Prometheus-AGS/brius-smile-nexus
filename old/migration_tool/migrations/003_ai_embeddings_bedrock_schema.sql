-- AI Embeddings Schema for Amazon Bedrock Titan Text Embeddings v2
-- This script creates the AI embeddings infrastructure optimized for Amazon Bedrock
-- It replaces the previous OpenAI-based embeddings with Bedrock Titan v2 (1024 dimensions)
-- This migration is designed to be idempotent and can be run safely multiple times.

-- Enable pgvector extension for vector operations
--- CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing embedding tables if they exist (from previous OpenAI implementation)
DROP TABLE IF EXISTS case_embeddings CASCADE;
DROP TABLE IF EXISTS patient_embeddings CASCADE;
DROP TABLE IF EXISTS message_embeddings CASCADE;

-- Create unified AI embeddings table for Amazon Bedrock Titan Text Embeddings v2
CREATE TABLE IF NOT EXISTS ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash for deduplication
  content_type TEXT NOT NULL CHECK (content_type IN (
    'case_description', 
    'patient_note', 
    'case_note', 
    'case_action',
    'case_summary',
    'treatment_plan',
    'diagnosis',
    'message_content'
  )),
  source_table TEXT NOT NULL CHECK (source_table IN (
    'cases', 
    'patients', 
    'case_notes', 
    'case_actions',
    'case_messages',
    'patient_notes'
  )),
  source_id UUID NOT NULL, -- Foreign key to source record
  content_text TEXT NOT NULL, -- Original content that was embedded
  embedding_vector VECTOR(1024), -- Amazon Titan Text Embeddings v2 dimensions
  embedding_model TEXT NOT NULL DEFAULT 'amazon.titan-embed-text-v2:0',
  embedding_dimensions INTEGER NOT NULL DEFAULT 1024,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}' -- Additional context and processing metadata
);

-- Create HNSW indexes for efficient vector similarity search
-- HNSW is generally better than IVFFlat for most use cases
CREATE INDEX IF NOT EXISTS ai_embeddings_vector_cosine_idx ON ai_embeddings 
USING hnsw (embedding_vector vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS ai_embeddings_vector_l2_idx ON ai_embeddings 
USING hnsw (embedding_vector vector_l2_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS ai_embeddings_vector_ip_idx ON ai_embeddings 
USING hnsw (embedding_vector vector_ip_ops) WITH (m = 16, ef_construction = 64);

-- Additional indexes for filtering and optimization
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_content_type ON ai_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_source_table ON ai_embeddings(source_table);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_source_id ON ai_embeddings(source_id);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_content_hash ON ai_embeddings(content_hash);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_created_at ON ai_embeddings(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_updated_at ON ai_embeddings(updated_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_source_composite ON ai_embeddings(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_content_source ON ai_embeddings(content_type, source_table);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_model_dims ON ai_embeddings(embedding_model, embedding_dimensions);

-- Add embedding reference columns to existing tables where appropriate
-- These columns will store the ID of the corresponding embedding record

-- Add embedding reference to cases table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'primary_embedding_id'
  ) THEN
    ALTER TABLE cases ADD COLUMN primary_embedding_id UUID REFERENCES ai_embeddings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add embedding reference to patients table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'primary_embedding_id'
  ) THEN
    ALTER TABLE patients ADD COLUMN primary_embedding_id UUID REFERENCES ai_embeddings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add embedding reference to case_messages table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'case_messages' AND column_name = 'primary_embedding_id'
  ) THEN
    ALTER TABLE case_messages ADD COLUMN primary_embedding_id UUID REFERENCES ai_embeddings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes on the new embedding reference columns
CREATE INDEX IF NOT EXISTS idx_cases_primary_embedding ON cases(primary_embedding_id) WHERE primary_embedding_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_primary_embedding ON patients(primary_embedding_id) WHERE primary_embedding_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_case_messages_primary_embedding ON case_messages(primary_embedding_id) WHERE primary_embedding_id IS NOT NULL;

-- Semantic search functions optimized for Amazon Bedrock Titan embeddings
-- Drop existing function if it exists to handle return type changes
DROP FUNCTION IF EXISTS search_similar_content(vector, text[], text[], double precision, integer, text);
DROP FUNCTION IF EXISTS search_similar_content(vector, text[], text[], float, integer, text);
DROP FUNCTION IF EXISTS search_similar_content(vector(1024), text[], text[], double precision, integer, text);
DROP FUNCTION IF EXISTS search_similar_content(vector(1024), text[], text[], float, integer, text);

CREATE OR REPLACE FUNCTION search_similar_content(
  query_embedding VECTOR(1024),
  content_types TEXT[] DEFAULT NULL,
  source_tables TEXT[] DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INTEGER DEFAULT 10,
  distance_function TEXT DEFAULT 'cosine'
)
RETURNS TABLE (
  embedding_id UUID,
  source_table TEXT,
  source_id UUID,
  content_type TEXT,
  content_text TEXT,
  similarity FLOAT,
  metadata JSONB
) AS $$
DECLARE
  distance_operator TEXT;
BEGIN
  -- Set the appropriate distance operator based on function parameter
  CASE distance_function
    WHEN 'cosine' THEN distance_operator := '<=>';
    WHEN 'l2' THEN distance_operator := '<->';
    WHEN 'inner_product' THEN distance_operator := '<#>';
    ELSE distance_operator := '<=>'; -- Default to cosine
  END CASE;

  -- Build and execute the dynamic query
  RETURN QUERY EXECUTE format('
    SELECT 
      ae.id,
      ae.source_table,
      ae.source_id,
      ae.content_type,
      ae.content_text,
      CASE 
        WHEN $4 = ''cosine'' THEN 1 - (ae.embedding_vector <=> $1)
        WHEN $4 = ''inner_product'' THEN ae.embedding_vector <#> $1
        ELSE 1 / (1 + (ae.embedding_vector <-> $1))
      END AS similarity,
      ae.metadata
    FROM ai_embeddings ae
    WHERE ae.embedding_vector IS NOT NULL
      AND ($2 IS NULL OR ae.content_type = ANY($2))
      AND ($3 IS NULL OR ae.source_table = ANY($3))
      AND CASE 
        WHEN $4 = ''cosine'' THEN 1 - (ae.embedding_vector <=> $1) > $5
        WHEN $4 = ''inner_product'' THEN ae.embedding_vector <#> $1 > $5
        ELSE 1 / (1 + (ae.embedding_vector <-> $1)) > $5
      END
    ORDER BY ae.embedding_vector %s $1
    LIMIT $6
  ', distance_operator)
  USING query_embedding, content_types, source_tables, distance_function, similarity_threshold, max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to search similar cases specifically
-- Drop existing function if it exists to handle return type changes
DROP FUNCTION IF EXISTS search_similar_cases(vector, double precision, integer);
DROP FUNCTION IF EXISTS search_similar_cases(vector, float, integer);
DROP FUNCTION IF EXISTS search_similar_cases(vector(1024), double precision, integer);
DROP FUNCTION IF EXISTS search_similar_cases(vector(1024), float, integer);

CREATE OR REPLACE FUNCTION search_similar_cases(
  query_embedding VECTOR(1024),
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  case_id UUID,
  case_title TEXT,
  case_description TEXT,
  content_text TEXT,
  similarity FLOAT,
  case_type case_type_enum,
  current_state case_state_enum
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    ae.content_text,
    1 - (ae.embedding_vector <=> query_embedding) AS similarity,
    c.case_type,
    c.current_state
  FROM ai_embeddings ae
  JOIN cases c ON ae.source_id = c.id
  WHERE ae.source_table = 'cases'
    AND ae.embedding_vector IS NOT NULL
    AND 1 - (ae.embedding_vector <=> query_embedding) > similarity_threshold
  ORDER BY ae.embedding_vector <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to search similar patients
-- Drop existing function if it exists to handle return type changes
DROP FUNCTION IF EXISTS search_similar_patients(vector, double precision, integer);
DROP FUNCTION IF EXISTS search_similar_patients(vector, float, integer);
DROP FUNCTION IF EXISTS search_similar_patients(vector(1024), double precision, integer);
DROP FUNCTION IF EXISTS search_similar_patients(vector(1024), float, integer);

CREATE OR REPLACE FUNCTION search_similar_patients(
  query_embedding VECTOR(1024),
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  patient_id UUID,
  patient_name TEXT,
  content_text TEXT,
  similarity FLOAT,
  medical_history JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name || ' ' || p.last_name,
    ae.content_text,
    1 - (ae.embedding_vector <=> query_embedding) AS similarity,
    p.medical_history
  FROM ai_embeddings ae
  JOIN patients p ON ae.source_id = p.id
  WHERE ae.source_table = 'patients'
    AND ae.embedding_vector IS NOT NULL
    AND 1 - (ae.embedding_vector <=> query_embedding) > similarity_threshold
  ORDER BY ae.embedding_vector <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to find duplicate or similar content based on embeddings
-- Drop existing function if it exists to handle return type changes
DROP FUNCTION IF EXISTS find_duplicate_content(text, double precision, integer);
DROP FUNCTION IF EXISTS find_duplicate_content(text, float, integer);

CREATE OR REPLACE FUNCTION find_duplicate_content(
  content_hash_input TEXT,
  similarity_threshold FLOAT DEFAULT 0.95,
  max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
  embedding_id UUID,
  source_table TEXT,
  source_id UUID,
  content_type TEXT,
  similarity FLOAT,
  is_exact_duplicate BOOLEAN
) AS $$
DECLARE
  reference_embedding VECTOR(1024);
BEGIN
  -- Get the embedding for the provided content hash
  SELECT embedding_vector INTO reference_embedding
  FROM ai_embeddings 
  WHERE content_hash = content_hash_input
  LIMIT 1;
  
  -- If no embedding found, return empty result
  IF reference_embedding IS NULL THEN
    RETURN;
  END IF;
  
  -- Find similar content
  RETURN QUERY
  SELECT 
    ae.id,
    ae.source_table,
    ae.source_id,
    ae.content_type,
    1 - (ae.embedding_vector <=> reference_embedding) AS similarity,
    ae.content_hash = content_hash_input AS is_exact_duplicate
  FROM ai_embeddings ae
  WHERE ae.embedding_vector IS NOT NULL
    AND ae.content_hash != content_hash_input
    AND 1 - (ae.embedding_vector <=> reference_embedding) > similarity_threshold
  ORDER BY ae.embedding_vector <=> reference_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to get embedding statistics
CREATE OR REPLACE FUNCTION get_embedding_statistics()
RETURNS TABLE (
  total_embeddings BIGINT,
  embeddings_by_content_type JSONB,
  embeddings_by_source_table JSONB,
  embeddings_by_model JSONB,
  avg_content_length NUMERIC,
  oldest_embedding TIMESTAMPTZ,
  newest_embedding TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_embeddings,
    jsonb_object_agg(content_type, cnt) as embeddings_by_content_type,
    jsonb_object_agg(source_table, cnt2) as embeddings_by_source_table,
    jsonb_object_agg(embedding_model, cnt3) as embeddings_by_model,
    AVG(LENGTH(content_text)) as avg_content_length,
    MIN(created_at) as oldest_embedding,
    MAX(created_at) as newest_embedding
  FROM ai_embeddings ae
  CROSS JOIN LATERAL (
    SELECT content_type, COUNT(*) as cnt
    FROM ai_embeddings 
    GROUP BY content_type
  ) ct
  CROSS JOIN LATERAL (
    SELECT source_table, COUNT(*) as cnt2
    FROM ai_embeddings 
    GROUP BY source_table
  ) st
  CROSS JOIN LATERAL (
    SELECT embedding_model, COUNT(*) as cnt3
    FROM ai_embeddings 
    GROUP BY embedding_model
  ) em;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS ai_embeddings_updated_at_trigger ON ai_embeddings;
CREATE TRIGGER ai_embeddings_updated_at_trigger
  BEFORE UPDATE ON ai_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_embeddings_updated_at();

-- Enable Row Level Security
ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AI embeddings table
CREATE POLICY "Enable all access for admin users" ON ai_embeddings
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Policy for practice members to access embeddings related to their practice's data
CREATE POLICY "Enable practice member access" ON ai_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practice_members pm
      JOIN profiles p ON pm.profile_id = p.id
      WHERE p.id = auth.uid()
        AND (
          (source_table = 'cases' AND EXISTS (
            SELECT 1 FROM cases c WHERE c.id = ai_embeddings.source_id AND c.practice_id = pm.practice_id
          ))
          OR
          (source_table = 'patients' AND EXISTS (
            SELECT 1 FROM patients pt WHERE pt.id = ai_embeddings.source_id AND pt.practice_id = pm.practice_id
          ))
          OR
          (source_table = 'case_messages' AND EXISTS (
            SELECT 1 FROM case_messages cm 
            JOIN cases c ON cm.case_id = c.id 
            WHERE cm.id = ai_embeddings.source_id AND c.practice_id = pm.practice_id
          ))
        )
    )
  );

-- Create a view for easier querying of embeddings with source data
CREATE OR REPLACE VIEW ai_embeddings_with_source AS
SELECT 
  ae.id,
  ae.content_hash,
  ae.content_type,
  ae.source_table,
  ae.source_id,
  ae.content_text,
  ae.embedding_vector,
  ae.embedding_model,
  ae.embedding_dimensions,
  ae.created_at,
  ae.updated_at,
  ae.metadata,
  CASE 
    WHEN ae.source_table = 'cases' THEN 
      jsonb_build_object(
        'title', c.title,
        'description', c.description,
        'case_type', c.case_type,
        'current_state', c.current_state,
        'practice_id', c.practice_id
      )
    WHEN ae.source_table = 'patients' THEN 
      jsonb_build_object(
        'name', p.first_name || ' ' || p.last_name,
        'patient_number', p.patient_number,
        'practice_id', p.practice_id
      )
    WHEN ae.source_table = 'case_messages' THEN 
      jsonb_build_object(
        'subject', cm.subject,
        'message_type', cm.message_type,
        'case_id', cm.case_id
      )
    ELSE NULL
  END as source_data
FROM ai_embeddings ae
LEFT JOIN cases c ON ae.source_table = 'cases' AND ae.source_id = c.id
LEFT JOIN patients p ON ae.source_table = 'patients' AND ae.source_id = p.id
LEFT JOIN case_messages cm ON ae.source_table = 'case_messages' AND ae.source_id = cm.id;

-- Grant appropriate permissions
GRANT SELECT ON ai_embeddings_with_source TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_embeddings TO authenticated;
-- Note: No sequence grant needed since ai_embeddings uses UUID primary key with gen_random_uuid()

-- Create a function to clean up orphaned embeddings
CREATE OR REPLACE FUNCTION cleanup_orphaned_embeddings()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete embeddings where the source record no longer exists
  WITH deleted AS (
    DELETE FROM ai_embeddings ae
    WHERE (
      (ae.source_table = 'cases' AND NOT EXISTS (SELECT 1 FROM cases WHERE id = ae.source_id))
      OR
      (ae.source_table = 'patients' AND NOT EXISTS (SELECT 1 FROM patients WHERE id = ae.source_id))
      OR
      (ae.source_table = 'case_messages' AND NOT EXISTS (SELECT 1 FROM case_messages WHERE id = ae.source_id))
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE ai_embeddings IS 'Stores AI-generated embeddings for semantic search using Amazon Bedrock Titan Text Embeddings v2';
COMMENT ON COLUMN ai_embeddings.content_hash IS 'SHA-256 hash of content_text for deduplication';
COMMENT ON COLUMN ai_embeddings.embedding_vector IS 'Vector embedding generated by Amazon Titan Text Embeddings v2 (1024 dimensions)';
COMMENT ON COLUMN ai_embeddings.embedding_model IS 'Model identifier used to generate the embedding';
COMMENT ON COLUMN ai_embeddings.metadata IS 'Additional context including chunking info, processing timestamps, etc.';

COMMENT ON FUNCTION search_similar_content IS 'Generic function to search for similar content across all embedding types';
COMMENT ON FUNCTION search_similar_cases IS 'Specialized function to search for similar cases with case-specific data';
COMMENT ON FUNCTION search_similar_patients IS 'Specialized function to search for similar patients with patient-specific data';
COMMENT ON FUNCTION find_duplicate_content IS 'Function to identify duplicate or highly similar content';
COMMENT ON FUNCTION get_embedding_statistics IS 'Function to get comprehensive statistics about stored embeddings';
COMMENT ON FUNCTION cleanup_orphaned_embeddings IS 'Function to remove embeddings where source records have been deleted';