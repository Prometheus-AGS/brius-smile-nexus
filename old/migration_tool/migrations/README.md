# Database Migrations

This directory contains SQL migration files for the Brius Smile Nexus application. The migrations are designed to be executed in order and are idempotent (safe to run multiple times).

## Migration Order

Execute the migrations in the following order:

1. **001_main_schema.sql** - Core application schema with all base tables
2. **002_migration_tracking_schema.sql** - Migration tracking and monitoring infrastructure
3. **003_ai_embeddings_bedrock_schema.sql** - AI embeddings infrastructure for Amazon Bedrock

## AI Embeddings Migration (003)

The AI embeddings migration creates a comprehensive infrastructure for semantic search using Amazon Bedrock Titan Text Embeddings v2.

### Key Features

- **Unified Embeddings Table**: Single `ai_embeddings` table for all content types
- **Amazon Bedrock Integration**: Optimized for Titan Text Embeddings v2 (1024 dimensions)
- **Content Deduplication**: SHA-256 hashing prevents duplicate embeddings
- **Multiple Distance Functions**: Support for cosine, L2, and inner product similarity
- **HNSW Indexing**: High-performance vector search indexes
- **Multi-tenant Security**: Row Level Security policies for practice-based access
- **Comprehensive Search Functions**: Specialized functions for different content types

### Supported Content Types

- `case_description` - Case titles and descriptions
- `patient_note` - Patient medical notes and history
- `case_note` - Case-specific notes and observations
- `case_action` - Actions taken on cases
- `case_summary` - Summarized case information
- `treatment_plan` - Treatment planning documents
- `diagnosis` - Diagnostic information
- `message_content` - Case message content

### Source Tables

- `cases` - Case records
- `patients` - Patient records
- `case_notes` - Case notes (if implemented)
- `case_actions` - Case actions (if implemented)
- `case_messages` - Case communication
- `patient_notes` - Patient notes (if implemented)

### Vector Search Functions

#### `search_similar_content()`
Generic function for searching across all content types with flexible filtering:
```sql
SELECT * FROM search_similar_content(
  query_embedding := your_embedding_vector,
  content_types := ARRAY['case_description', 'treatment_plan'],
  source_tables := ARRAY['cases'],
  similarity_threshold := 0.7,
  max_results := 10,
  distance_function := 'cosine'
);
```

#### `search_similar_cases()`
Specialized function for case similarity search:
```sql
SELECT * FROM search_similar_cases(
  query_embedding := your_embedding_vector,
  similarity_threshold := 0.7,
  max_results := 10
);
```

#### `search_similar_patients()`
Specialized function for patient similarity search:
```sql
SELECT * FROM search_similar_patients(
  query_embedding := your_embedding_vector,
  similarity_threshold := 0.7,
  max_results := 10
);
```

### Utility Functions

#### `find_duplicate_content()`
Identifies duplicate or highly similar content:
```sql
SELECT * FROM find_duplicate_content(
  content_hash_input := 'your_content_hash',
  similarity_threshold := 0.95,
  max_results := 5
);
```

#### `get_embedding_statistics()`
Provides comprehensive statistics about stored embeddings:
```sql
SELECT * FROM get_embedding_statistics();
```

#### `cleanup_orphaned_embeddings()`
Removes embeddings where source records have been deleted:
```sql
SELECT cleanup_orphaned_embeddings();
```

### Performance Optimization

The migration includes several performance optimizations:

1. **HNSW Indexes**: Three HNSW indexes for different distance functions
2. **Composite Indexes**: Optimized for common query patterns
3. **Partial Indexes**: Conditional indexes for better performance
4. **Query Optimization**: Functions use efficient query patterns

### Security

Row Level Security (RLS) is enabled with policies for:

- **Admin Access**: Full access for admin users
- **Practice Member Access**: Access to embeddings related to their practice's data
- **Multi-tenant Isolation**: Ensures data separation between practices

### Integration with Existing Schema

The migration adds embedding reference columns to existing tables:

- `cases.primary_embedding_id` - References the main case embedding
- `patients.primary_embedding_id` - References the main patient embedding
- `case_messages.primary_embedding_id` - References the message embedding

### Monitoring and Maintenance

Use the provided utility functions for ongoing maintenance:

1. **Monitor Statistics**: Regularly check `get_embedding_statistics()`
2. **Clean Orphaned Data**: Periodically run `cleanup_orphaned_embeddings()`
3. **Performance Monitoring**: Monitor query performance and adjust indexes as needed

## Execution Instructions

### Using Supabase CLI
```bash
supabase db reset
# Or apply individual migrations:
supabase db push --include-all
```

### Using psql
```bash
psql -h your-host -U your-user -d your-database -f 001_main_schema.sql
psql -h your-host -U your-user -d your-database -f 002_migration_tracking_schema.sql
psql -h your-host -U your-user -d your-database -f 003_ai_embeddings_bedrock_schema.sql
```

### Using the Migration Tool
The migration tool in this project can execute these migrations automatically with proper error handling and rollback capabilities.

## Notes

- All migrations are idempotent and can be safely re-run
- The pgvector extension is required for vector operations
- Ensure your PostgreSQL version supports the pgvector extension
- Monitor performance after applying vector indexes on large datasets
- Consider adjusting HNSW index parameters based on your data size and query patterns

## Troubleshooting

### Common Issues

1. **pgvector Extension Not Available**
   - Ensure pgvector is installed on your PostgreSQL instance
   - Supabase includes pgvector by default

2. **Performance Issues with Vector Queries**
   - Adjust HNSW index parameters (m, ef_construction)
   - Consider using different distance functions based on your use case
   - Monitor query execution plans

3. **Memory Usage**
   - Vector indexes can be memory-intensive
   - Monitor PostgreSQL memory usage after applying migrations
   - Consider adjusting shared_buffers and work_mem settings

4. **RLS Policy Issues**
   - Ensure users have proper practice memberships
   - Check that auth.uid() returns expected values
   - Verify profile and practice_member relationships