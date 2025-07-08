/**
 * @file Dify Knowledge Base API Integration Types
 * @description Type definitions for Dify knowledge base operations, document management,
 * and API responses. These types support the dual-path AI embeddings approach alongside
 * Amazon Bedrock integration.
 */

/**
 * @interface DifyConfig
 * @description Configuration interface for Dify API integration
 */
export interface DifyConfig {
  apiKey: string;
  baseUrl: string;
  knowledgeBases: {
    cases: string;
    patients: string;
    notes: string;
  };
  enabled: boolean;
  retryAttempts: number;
  timeoutMs: number;
}

/**
 * @interface DifyDataset
 * @description Represents a Dify knowledge base dataset
 */
export interface DifyDataset {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  permission: string;
  data_source_type: string | null;
  indexing_technique: string | null;
  app_count: number;
  document_count: number;
  word_count: number;
  created_by: string;
  created_at: number;
  updated_by: string;
  updated_at: number;
  embedding_model: string | null;
  embedding_model_provider: string | null;
  embedding_available: boolean | null;
}

/**
 * @interface DifyDocument
 * @description Represents a document within a Dify dataset
 */
export interface DifyDocument {
  id: string;
  position: number;
  data_source_type: string;
  data_source_info: {
    upload_file_id: string;
  };
  dataset_process_rule_id: string;
  name: string;
  created_from: string;
  created_by: string;
  created_at: number;
  tokens: number;
  indexing_status: 'waiting' | 'parsing' | 'cleaning' | 'splitting' | 'indexing' | 'completed' | 'error' | 'paused';
  error: string | null;
  enabled: boolean;
  disabled_at: number | null;
  disabled_by: string | null;
  archived: boolean;
  display_status: string;
  word_count: number;
  hit_count: number;
  doc_form: string;
}

/**
 * @interface DifyDocumentSegment
 * @description Represents a segment within a Dify document
 */
export interface DifyDocumentSegment {
  id: string;
  position: number;
  document_id: string;
  content: string;
  answer: string | null;
  word_count: number;
  tokens: number;
  keywords: string[];
  index_node_id: string;
  index_node_hash: string;
  hit_count: number;
  enabled: boolean;
  disabled_at: number | null;
  disabled_by: string | null;
  status: string;
  created_by: string;
  created_at: number;
  indexing_at: number;
  completed_at: number;
  error: string | null;
  stopped_at: number | null;
}

/**
 * @interface CreateDatasetRequest
 * @description Request payload for creating a new dataset
 */
export interface CreateDatasetRequest {
  name: string;
  permission: 'only_me' | 'all_team_members' | 'partial_members';
  indexing_technique: 'high_quality' | 'economy';
  embedding_model?: {
    embedding_provider_name: string;
    embedding_model_name: string;
  };
  retrieval_model?: {
    search_method: 'semantic_search' | 'full_text_search' | 'hybrid';
    reranking_enable: boolean;
    reranking_mode?: 'rerank_model' | 'weighted_score';
    reranking_model?: {
      reranking_provider_name: string;
      reranking_model_name: string;
    };
    top_k: number;
    score_threshold_enabled: boolean;
    score_threshold?: number;
  };
}

/**
 * @interface CreateDocumentByTextRequest
 * @description Request payload for creating a document from text
 */
export interface CreateDocumentByTextRequest {
  name: string;
  text: string;
  indexing_technique: 'high_quality' | 'economy';
  process_rule: {
    mode: 'automatic' | 'custom';
    rules?: {
      pre_processing_rules?: Array<{
        id: string;
        enabled: boolean;
      }>;
      segmentation?: {
        separator: string;
        max_tokens: number;
      };
    };
  };
}

/**
 * @interface DifyApiResponse
 * @description Generic API response wrapper
 */
export interface DifyApiResponse<T = unknown> {
  data: T;
  has_more?: boolean;
  limit?: number;
  total?: number;
  page?: number;
}

/**
 * @interface DifyErrorResponse
 * @description Error response structure from Dify API
 */
export interface DifyErrorResponse {
  code: string;
  message: string;
  status: number;
}

/**
 * @interface DifySearchRequest
 * @description Request payload for searching within a dataset (Updated for Dify 1.4.x)
 */
export interface DifySearchRequest {
  query: string;
  retrieval_model?: {
    search_method?: 'vector_search' | 'keyword_search' | 'hybrid_search';
    reranking_enable?: boolean;
    reranking_mode?: 'reranking_model' | 'weighted_score';
    reranking_model?: {
      reranking_provider_name: string;
      reranking_model_name: string;
    };
    weights?: {
      vector_search: number;
      keyword_search: number;
    };
    top_k?: number;
    score_threshold_enabled?: boolean;
    score_threshold?: number;
    reranking_top_k?: number;
  };
}

/**
 * @interface DifySearchResult
 * @description Search result from Dify knowledge base
 */
export interface DifySearchResult {
  id: string;
  content: string;
  source: string;
  score: number;
  title: string;
  metadata: Record<string, unknown>;
}

/**
 * @interface DifyBatchOperationResult
 * @description Result of batch operations on Dify
 */
export interface DifyBatchOperationResult {
  successful: number;
  failed: number;
  errors: Array<{
    item: string;
    error: string;
  }>;
}

/**
 * @interface DifyServiceHealth
 * @description Health check result for Dify service
 */
export interface DifyServiceHealth {
  isHealthy: boolean;
  responseTime: number;
  lastChecked: Date;
  error?: string | undefined;
}

/**
 * @interface DifyRetryConfig
 * @description Configuration for retry logic
 */
export interface DifyRetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * @type DifyContentType
 * @description Supported content types for Dify integration
 */
export type DifyContentType = 'cases' | 'patients' | 'notes';

/**
 * @type DifyOperationStatus
 * @description Status of Dify operations
 */
export type DifyOperationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * @interface DifyOperationResult
 * @description Result of a Dify operation with status tracking
 */
export interface DifyOperationResult<T = unknown> {
  status: DifyOperationStatus;
  data?: T;
  error?: string;
  timestamp: Date;
  operationId: string;
}