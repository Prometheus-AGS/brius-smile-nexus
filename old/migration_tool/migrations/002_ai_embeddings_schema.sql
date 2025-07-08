-- AI Embeddings and Workflow Schema Extension
-- This script adds the missing AI capabilities to the existing schema
-- It is designed to be idempotent and can be run safely multiple times.

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- AI Embeddings Tables
CREATE TABLE IF NOT EXISTS case_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content_type embedding_content_type NOT NULL,
  content_text TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 dimensions
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  content_type embedding_content_type NOT NULL,
  content_text TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES case_messages(id) ON DELETE CASCADE,
  content_text TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Templates and Steps
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  case_type case_type_enum NOT NULL,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  state case_state_enum NOT NULL,
  auto_transition BOOLEAN DEFAULT false,
  required_roles practice_role[],
  estimated_duration INTERVAL,
  metadata JSONB DEFAULT '{}',
  UNIQUE(workflow_template_id, step_order)
);

-- Add workflow reference to cases table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cases' AND column_name = 'workflow_template_id'
  ) THEN
    ALTER TABLE cases ADD COLUMN workflow_template_id UUID REFERENCES workflow_templates(id);
  END IF;
END $$;

-- Vector similarity search indexes
CREATE INDEX IF NOT EXISTS case_embeddings_vector_idx ON case_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS patient_embeddings_vector_idx ON patient_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS message_embeddings_vector_idx ON message_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Additional indexes for AI queries
CREATE INDEX IF NOT EXISTS idx_case_embeddings_case_type ON case_embeddings(case_id, content_type);
CREATE INDEX IF NOT EXISTS idx_patient_embeddings_patient_type ON patient_embeddings(patient_id, content_type);
CREATE INDEX IF NOT EXISTS idx_message_embeddings_message ON message_embeddings(message_id);

-- Workflow optimization indexes
CREATE INDEX IF NOT EXISTS idx_workflow_steps_template_order ON workflow_steps(workflow_template_id, step_order);
CREATE INDEX IF NOT EXISTS idx_cases_workflow_template ON cases(workflow_template_id) WHERE workflow_template_id IS NOT NULL;

-- Semantic search functions
CREATE OR REPLACE FUNCTION search_similar_cases(
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.8,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  case_id UUID,
  content_text TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.case_id,
    ce.content_text,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM case_embeddings ce
  WHERE 1 - (ce.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_similar_patients(
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.8,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  patient_id UUID,
  content_text TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.patient_id,
    pe.content_text,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM patient_embeddings pe
  WHERE 1 - (pe.embedding <=> query_embedding) > similarity_threshold
  ORDER BY pe.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- AI workflow triggers for automatic embedding generation
CREATE OR REPLACE FUNCTION generate_case_embedding_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a record to trigger embedding generation
  INSERT INTO case_embeddings (case_id, content_type, content_text, metadata)
  VALUES (
    NEW.id,
    'case_summary',
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''),
    jsonb_build_object('auto_generated', true, 'trigger_event', TG_OP)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_message_embedding_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a record to trigger embedding generation
  INSERT INTO message_embeddings (message_id, content_text, metadata)
  VALUES (
    NEW.id,
    COALESCE(NEW.subject, '') || ' ' || NEW.content,
    jsonb_build_object('auto_generated', true, 'trigger_event', TG_OP)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic embedding generation
DROP TRIGGER IF EXISTS case_embedding_trigger ON cases;
CREATE TRIGGER case_embedding_trigger
  AFTER INSERT OR UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION generate_case_embedding_trigger();

DROP TRIGGER IF EXISTS message_embedding_trigger ON case_messages;
CREATE TRIGGER message_embedding_trigger
  AFTER INSERT ON case_messages
  FOR EACH ROW
  EXECUTE FUNCTION generate_message_embedding_trigger();

-- RLS Policies for AI tables
ALTER TABLE case_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

-- Admin access policies
CREATE POLICY "Enable all access for admin users" ON case_embeddings
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Enable all access for admin users" ON patient_embeddings
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Enable all access for admin users" ON message_embeddings
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Enable all access for admin users" ON workflow_templates
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Enable all access for admin users" ON workflow_steps
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Insert default workflow templates
INSERT INTO workflow_templates (name, description, case_type, active) VALUES
  ('Standard Treatment Planning', 'Default workflow for treatment planning cases', 'treatment_planning', true),
  ('Initial Consultation', 'Workflow for initial patient consultations', 'initial_consultation', true),
  ('Active Treatment', 'Workflow for active treatment cases', 'active_treatment', true),
  ('Emergency Cases', 'Fast-track workflow for emergency cases', 'emergency', true)
ON CONFLICT DO NOTHING;

-- Insert default workflow steps for treatment planning
WITH template_id AS (
  SELECT id FROM workflow_templates WHERE case_type = 'treatment_planning' LIMIT 1
)
INSERT INTO workflow_steps (workflow_template_id, step_order, name, description, state, auto_transition, required_roles, estimated_duration) 
SELECT 
  template_id.id,
  step_order,
  name,
  description,
  state::case_state_enum,
  auto_transition,
  required_roles::practice_role[],
  estimated_duration::interval
FROM template_id, (VALUES
  (1, 'Case Submission', 'Patient submits case for review', 'submitted', false, ARRAY['doctor', 'technician']::practice_role[], '1 day'),
  (2, 'Initial Review', 'Clinical review of submitted case', 'under_review', false, ARRAY['doctor']::practice_role[], '2 days'),
  (3, 'Treatment Planning', 'Create detailed treatment plan', 'planning', false, ARRAY['doctor']::practice_role[], '3 days'),
  (4, 'Plan Approval', 'Approve treatment plan', 'approved', false, ARRAY['doctor']::practice_role[], '1 day'),
  (5, 'Production', 'Manufacturing of treatment devices', 'in_production', true, ARRAY['technician']::practice_role[], '7 days'),
  (6, 'Quality Check', 'Quality assurance review', 'quality_check', false, ARRAY['technician']::practice_role[], '1 day'),
  (7, 'Shipping', 'Ship to patient/practice', 'shipped', true, ARRAY['technician']::practice_role[], '2 days'),
  (8, 'Delivery', 'Delivered to patient', 'delivered', true, ARRAY[]::practice_role[], '1 day'),
  (9, 'Completion', 'Case completed successfully', 'completed', false, ARRAY['doctor']::practice_role[], '0 days')
) AS steps(step_order, name, description, state, auto_transition, required_roles, estimated_duration)
ON CONFLICT DO NOTHING;