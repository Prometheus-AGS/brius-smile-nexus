# Complete Guide to Dify 1.4.x Knowledge Base Management with REST API

This comprehensive guide covers creating, deleting, and managing Dify knowledge bases using the REST API with knowledge base API keys on a self-hosted open source installation. It includes detailed instructions for configuring hybrid advanced knowledge bases with Amazon Bedrock Titan v2 embedding model and Bedrock Cohere 3.5 reranking model.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [API Authentication](#api-authentication)
3. [Base URL Configuration](#base-url-configuration)
4. [Knowledge Base Management Operations](#knowledge-base-management-operations)
5. [Document Management](#document-management)
6. [Amazon Bedrock Integration](#amazon-bedrock-integration)
7. [Hybrid Advanced Knowledge Bases](#hybrid-advanced-knowledge-bases)
8. [Advanced Configuration](#advanced-configuration)
9. [Metadata and Chunk Management](#metadata-and-chunk-management)
10. [Error Handling and Troubleshooting](#error-handling-and-troubleshooting)
11. [Best Practices](#best-practices)
12. [Production Deployment](#production-deployment)

## Prerequisites

Before starting, ensure you have:

- A self-hosted Dify 1.4.x installation running at `https://dify.brius.com`
- Admin access to the Dify platform
- Knowledge Base API key (different from Application API keys)
- Amazon Bedrock access with Titan v2 and Cohere 3.5 models enabled
- AWS credentials configured for Bedrock access
- PostgreSQL 15+ for database
- Redis for caching and session management
- Vector database (Weaviate/Qdrant) for embeddings

## API Authentication

### Obtaining Knowledge Base API Key

The Knowledge Base API uses a unified API key that can operate on all visible knowledge bases under the same account. This differs from Application API keys which are specific to individual applications.

**To obtain the API key:**

1. Navigate to the **Knowledge** page in your Dify platform
2. Switch to the **API ACCESS** tab in the left navigation
3. Generate or manage your API key in the **API Keys** section

**Authentication format:**
```bash
Authorization: Bearer {api_key}
Content-Type: application/json
```

**Security Implementation:**
- Dify uses PKCS1_OAEP encryption with tenant-specific key pairs
- Private keys stored in `api/storage/privkeys` directory
- API keys should only be called through backend services, never exposed in frontend code

**Environment Security Configuration:**
```bash
# Secret key for session signing and encryption
SECRET_KEY=<generate_with_openssl_rand_-base64_42>

# Session configuration
COOKIE_HTTPONLY=true
COOKIE_SAMESITE=Lax
SESSION_TYPE=redis
SESSION_REDIS_DB=0

# CORS security settings
CONSOLE_CORS_ALLOW_ORIGINS=https://dify.brius.com,*
WEB_API_CORS_ALLOW_ORIGINS=https://dify.brius.com,*
```

## Base URL Configuration

For your self-hosted installation, the base URL will be:
```
https://dify.brius.com/v1
```

All API endpoints follow the pattern:
```
https://dify.brius.com/v1/{endpoint}
```

## Knowledge Base Management Operations

### 1. Create an Empty Knowledge Base

Creates a new empty knowledge base that can be configured with documents later.

**Basic Request:**
```bash
curl --location --request POST 'https://dify.brius.com/v1/datasets' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "My Knowledge Base",
  "permission": "only_me"
}'
```

**Advanced Request with Bedrock Models:**
```bash
curl --location --request POST 'https://dify.brius.com/v1/datasets' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "Advanced Hybrid Knowledge Base",
  "permission": "only_me",
  "indexing_technique": "high_quality",
  "embedding_model_provider": "bedrock",
  "embedding_model": "amazon.titan-embed-text-v2:0",
  "retrieval_model": {
    "search_method": "hybrid_search",
    "reranking_enable": true,
    "reranking_mode": "reranking_model",
    "reranking_model": {
      "reranking_provider_name": "bedrock",
      "reranking_model_name": "cohere.rerank-v3-5:0"
    },
    "top_k": 5,
    "score_threshold_enabled": true,
    "score_threshold": 0.5
  }
}'
```

**Parameters:**
- `name` (required): Knowledge base name
- `permission` (optional): Access control - `"only_me"`, `"all_team_members"`, or `"partial_members"`
- `indexing_technique`: `"high_quality"` (vector/embeddings) or `"economy"` (keyword/inverted index)
- `embedding_model_provider`: Provider name (e.g., "bedrock", "openai")
- `embedding_model`: Specific model identifier

**Response:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Advanced Hybrid Knowledge Base",
  "description": null,
  "provider": "vendor",
  "permission": "only_me",
  "data_source_type": null,
  "indexing_technique": "high_quality",
  "app_count": 0,
  "document_count": 0,
  "word_count": 0,
  "created_by": "user-id",
  "created_at": 1695636173,
  "updated_by": "user-id",
  "updated_at": 1695636173,
  "embedding_model": "amazon.titan-embed-text-v2:0",
  "embedding_model_provider": "bedrock",
  "embedding_available": true
}
```

### 2. List Knowledge Bases

Retrieves all accessible knowledge bases with pagination.

**Request:**
```bash
curl --location --request GET 'https://dify.brius.com/v1/datasets?page=1&limit=20' \
--header 'Authorization: Bearer {api_key}'
```

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "dataset-uuid-here",
      "name": "My Knowledge Base",
      "description": "Description text",
      "permission": "only_me",
      "data_source_type": "upload_file",
      "indexing_technique": "high_quality",
      "app_count": 2,
      "document_count": 15,
      "word_count": 125000,
      "created_at": 1695636173,
      "updated_at": 1695640000
    }
  ],
  "has_more": false,
  "limit": 20,
  "total": 1,
  "page": 1
}
```

### 3. Get Knowledge Base Details

Retrieve detailed information about a specific knowledge base.

**Request:**
```bash
curl --location --request GET 'https://dify.brius.com/v1/datasets/{dataset_id}' \
--header 'Authorization: Bearer {api_key}'
```

### 4. Update Knowledge Base

Modify knowledge base settings and configuration.

**Request:**
```bash
curl --location --request PUT 'https://dify.brius.com/v1/datasets/{dataset_id}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "Updated Knowledge Base Name",
  "description": "Updated description",
  "permission": "all_team_members",
  "retrieval_model": {
    "search_method": "hybrid_search",
    "reranking_enable": true,
    "top_k": 8,
    "score_threshold": 0.6
  }
}'
```

### 5. Delete a Knowledge Base

Permanently removes a knowledge base and all its documents.

**Request:**
```bash
curl --location --request DELETE 'https://dify.brius.com/v1/datasets/{dataset_id}' \
--header 'Authorization: Bearer {api_key}'
```

**Response:**
```
204 No Content
```

## Document Management

### Creating Documents from Text

Adds a new document to an existing knowledge base using plain text.

**Request:**
```bash
curl --location --request POST 'https://dify.brius.com/v1/datasets/{dataset_id}/document/create_by_text' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "Technical Documentation",
  "text": "Your comprehensive document content here...",
  "indexing_technique": "high_quality",
  "process_rule": {
    "mode": "custom",
    "rules": {
      "pre_processing_rules": [
        {
          "id": "remove_extra_spaces",
          "enabled": true
        },
        {
          "id": "remove_urls_emails",
          "enabled": true
        }
      ],
      "segmentation": {
        "separator": "\n\n",
        "max_tokens": 500
      }
    }
  }
}'
```

### Creating Documents from Files

Uploads a file to create a new document.

**Request:**
```bash
curl --location --request POST 'https://dify.brius.com/v1/datasets/{dataset_id}/document/create_by_file' \
--header 'Authorization: Bearer {api_key}' \
--form 'data="{\"name\":\"Technical Manual\",\"indexing_technique\":\"high_quality\",\"process_rule\":{\"mode\":\"automatic\"}}";type=text/plain' \
--form 'file=@"/path/to/document.pdf"'
```

**Supported file types:** txt, markdown, md, pdf, html, htm, xlsx, docx, csv

**File size limits:**
- Default: 15MB per file
- Configurable via `UPLOAD_FILE_SIZE_LIMIT` environment variable
- Batch limit: 20 files (configurable via `UPLOAD_FILE_BATCH_LIMIT`)

### Document Processing Response

```json
{
  "document": {
    "id": "doc_f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "position": 1,
    "data_source_type": "upload_file",
    "dataset_process_rule_id": "rule_123",
    "name": "Technical_Manual.pdf",
    "created_from": "api",
    "tokens": 2500,
    "indexing_status": "completed",
    "error": null,
    "enabled": true,
    "word_count": 5000,
    "hit_count": 0,
    "doc_form": "text_model",
    "created_at": 1695636173,
    "updated_at": 1695636200
  },
  "batch": "batch_f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

### Document Status and Management

**Get document embedding status:**
```bash
curl --location --request GET 'https://dify.brius.com/v1/datasets/{dataset_id}/documents/{batch}/indexing-status' \
--header 'Authorization: Bearer {api_key}'
```

**Update document:**
```bash
curl --location --request PUT 'https://dify.brius.com/v1/datasets/{dataset_id}/documents/{document_id}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "Updated Document Name",
  "text": "Updated content...",
  "process_rule": {
    "mode": "custom",
    "rules": {
      "segmentation": {
        "max_tokens": 800
      }
    }
  }
}'
```

**Delete a document:**
```bash
curl --location --request DELETE 'https://dify.brius.com/v1/datasets/{dataset_id}/documents/{document_id}' \
--header 'Authorization: Bearer {api_key}'
```

**List documents in a knowledge base:**
```bash
curl --location --request GET 'https://dify.brius.com/v1/datasets/{dataset_id}/documents?page=1&limit=20' \
--header 'Authorization: Bearer {api_key}'
```

## Amazon Bedrock Integration

### Setting Up Bedrock Provider

First, configure Amazon Bedrock as a model provider in your Dify installation:

1. Navigate to **Settings** → **Model Provider** in your Dify admin panel
2. Add **Amazon Bedrock** as a provider
3. Configure your AWS credentials:
   - AWS Access Key ID
   - AWS Secret Access Key  
   - AWS Region (ensure it supports Titan v2 and Cohere 3.5)

**Environment Configuration:**
```bash
# AWS Bedrock configuration
AWS_BEDROCK_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Vector database configuration
VECTOR_STORE=weaviate
WEAVIATE_ENDPOINT=http://localhost:8080
WEAVIATE_API_KEY=your_weaviate_key
WEAVIATE_BATCH_SIZE=100
```

### Amazon Titan Text Embeddings V2 Configuration

Amazon Titan Text Embeddings V2 is optimized for Retrieval-Augmented Generation (RAG) and supports flexible embedding sizes.

**Key features:**
- Supports 256, 512, and 1024 dimensions
- Maintains 99% accuracy when reducing from 1024 to 512 dimensions
- Maintains 97% accuracy when reducing from 1024 to 256 dimensions
- Multilingual support for 100+ languages
- Unit vector normalization for improved similarity measurements
- Up to 8,192 tokens or 50,000 characters input capacity

**Model identifier:** `amazon.titan-embed-text-v2:0`

**Configuration:**
```json
{
  "provider": "bedrock",
  "credentials": {
    "aws_access_key_id": "YOUR_ACCESS_KEY",
    "aws_secret_access_key": "YOUR_SECRET_KEY",
    "aws_region": "us-east-1"
  },
  "models": {
    "embedding": {
      "model_id": "amazon.titan-embed-text-v2:0",
      "dimensions": 1024,
      "normalize": true,
      "input_text_truncate": "END"
    }
  }
}
```

**Direct API Usage:**
```bash
curl --location 'https://bedrock-runtime.us-east-1.amazonaws.com/model/amazon.titan-embed-text-v2:0/invoke' \
--header 'Content-Type: application/json' \
--header 'Authorization: AWS4-HMAC-SHA256 ...' \
--data '{
  "inputText": "Your text to embed",
  "dimensions": 1024,
  "normalize": true
}'
```

### Cohere Rerank 3.5 Configuration

Cohere Rerank 3.5 provides advanced reranking capabilities for improving search relevance.

**Key features:**
- Dynamic query-time analysis of document relevance
- Advanced semantic understanding
- Supports multiple languages
- Optimized for enterprise applications
- Superior performance in financial, ecommerce, and hospitality domains

**Model identifier:** `cohere.rerank-v3-5:0`

**Available regions:** us-west-2, ca-central-1, eu-central-1, ap-northeast-1

**Configuration in Dify:**
```json
{
  "reranking_enable": true,
  "reranking_mode": "reranking_model",
  "reranking_model": {
    "reranking_provider_name": "bedrock",
    "reranking_model_name": "cohere.rerank-v3-5:0"
  },
  "reranking_top_k": 10,
  "score_threshold": 0.5
}
```

**Direct API Usage:**
```bash
curl --location 'https://bedrock-runtime.us-west-2.amazonaws.com/model/cohere.rerank-v3-5:0/invoke' \
--header 'Content-Type: application/json' \
--header 'Authorization: AWS4-HMAC-SHA256 ...' \
--data '{
  "query": "user query",
  "documents": [
    {"text": "Document 1 content"},
    {"text": "Document 2 content"}
  ],
  "top_k": 5,
  "return_documents": true
}'
```

## Hybrid Advanced Knowledge Bases

### Multi-Path Retrieval Configuration

Dify 1.4.x supports sophisticated hybrid architectures combining multiple retrieval strategies:

**Search methods available:**
- **Semantic Search**: Vector-based similarity using embeddings
- **Keyword Search**: Full-text search with BM25 scoring  
- **Hybrid Search**: Weighted combination with reranking
- **External Knowledge Base**: Integration with AWS Bedrock Knowledge Bases

### Creating Complete Hybrid Knowledge Base

**Step 1: Create Knowledge Base with Advanced Configuration**

```bash
curl --location --request POST 'https://dify.brius.com/v1/datasets' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "Enterprise Hybrid Knowledge Base",
  "permission": "all_team_members",
  "indexing_technique": "high_quality",
  "embedding_model_provider": "bedrock",
  "embedding_model": "amazon.titan-embed-text-v2:0",
  "retrieval_model": {
    "search_method": "hybrid_search",
    "reranking_enable": true,
    "reranking_mode": "reranking_model",
    "reranking_model": {
      "reranking_provider_name": "bedrock",
      "reranking_model_name": "cohere.rerank-v3-5:0"
    },
    "weights": {
      "vector_search": 0.7,
      "keyword_search": 0.3
    },
    "top_k": 10,
    "score_threshold_enabled": true,
    "score_threshold": 0.6
  }
}'
```

### Hybrid Search Query Example

```bash
curl --location --request POST 'https://dify.brius.com/v1/datasets/{dataset_id}/retrieve' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "query": "API authentication methods and best practices",
  "retrieval_model": {
    "search_method": "hybrid_search",
    "reranking_enable": true,
    "reranking_mode": "reranking_model",
    "reranking_model": {
      "reranking_provider_name": "bedrock",
      "reranking_model_name": "cohere.rerank-v3-5:0"
    },
    "weights": {
      "vector_search": 0.7,
      "keyword_search": 0.3
    },
    "top_k": 10,
    "score_threshold_enabled": true,
    "score_threshold": 0.6
  }
}'
```

**Query Response:**
```json
{
  "query": {
    "content": "API authentication methods and best practices"
  },
  "records": [
    {
      "segment": {
        "id": "7fa6f24f-8679-48b3-bc9d-bdf28d73f218",
        "content": "API Authentication Guide: Use Bearer tokens for secure access...",
        "word_count": 847,
        "tokens": 280,
        "keywords": ["API", "authentication", "bearer", "token", "security"],
        "document": {
          "id": "a8c6c36f-9f5d-4d7a-8472-f5d7b75d71d2",
          "name": "api_security_guide.txt"
        }
      },
      "score": 0.95,
      "tsne_position": null
    }
  ]
}
```

## Advanced Configuration

### Retrieval Model Parameters

**Complete parameter reference:**
```json
{
  "retrieval_model": {
    "search_method": "hybrid_search",
    "reranking_enable": true,
    "reranking_mode": "reranking_model",
    "reranking_model": {
      "reranking_provider_name": "bedrock",
      "reranking_model_name": "cohere.rerank-v3-5:0"
    },
    "weights": {
      "vector_search": 0.7,
      "keyword_search": 0.3
    },
    "top_k": 10,
    "score_threshold_enabled": true,
    "score_threshold": 0.6,
    "reranking_top_k": 5
  }
}
```

**Parameters explanation:**
- `search_method`: `"vector_search"`, `"keyword_search"`, or `"hybrid_search"`
- `reranking_enable`: Enable/disable reranking functionality
- `top_k`: Maximum number of retrieved results (default: 3, max: 10)
- `score_threshold`: Minimum relevance score (0-1 range)
- `weights`: Relative importance of vector vs keyword search in hybrid mode
- `reranking_top_k`: Number of results to rerank

### Document Processing Configuration

**Advanced preprocessing rules:**
```json
{
  "process_rule": {
    "mode": "custom",
    "rules": {
      "pre_processing_rules": [
        {
          "id": "remove_extra_spaces",
          "enabled": true
        },
        {
          "id": "remove_urls_emails", 
          "enabled": true
        },
        {
          "id": "remove_stopwords",
          "enabled": false
        }
      ],
      "segmentation": {
        "separator": "\n\n",
        "max_tokens": 500,
        "chunk_overlap": 50
      }
    }
  }
}
```

### External Knowledge Base Integration

**Custom external API setup:**
```bash
curl --location 'https://your-api-endpoint.com/retrieval' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer your-api-key' \
--data '{
  "knowledge_id": "bedrock-kb-id",
  "query": "user question",
  "retrieval_setting": {
    "top_k": 5,
    "score_threshold": 0.6,
    "search_type": "HYBRID"
  }
}'
```

## Metadata and Chunk Management

### Adding Metadata Fields

Define custom metadata fields for enhanced filtering and organization:

```bash
curl --location 'https://dify.brius.com/v1/datasets/{dataset_id}/metadata' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {api_key}' \
--data '{
  "type": "string",
  "name": "document_category"
}'
```

**Supported metadata types:**
- `"string"`: Text-based information
- `"number"`: Numerical data
- `"time"`: Dates and timestamps

### Chunk Management

**Adding chunks to documents:**
```bash
curl --location --request POST 'https://dify.brius.com/v1/datasets/{dataset_id}/documents/{document_id}/segments' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "segments": [
    {
      "content": "Detailed technical content chunk here...",
      "answer": "Optional answer for QA pairs",
      "keywords": ["technical", "documentation", "API"],
      "metadata": {
        "document_category": "technical_guide",
        "priority": 1,
        "last_updated": "2024-01-15"
      }
    }
  ]
}'
```

**Get document segments:**
```bash
curl --location --request GET 'https://dify.brius.com/v1/datasets/{dataset_id}/documents/{document_id}/segments?page=1&limit=20' \
--header 'Authorization: Bearer {api_key}'
```

**Update a segment:**
```bash
curl --location --request PUT 'https://dify.brius.com/v1/datasets/{dataset_id}/documents/{document_id}/segments/{segment_id}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "content": "Updated segment content...",
  "keywords": ["updated", "content"],
  "metadata": {
    "document_category": "updated_guide"
  }
}'
```

**Delete a segment:**
```bash
curl --location --request DELETE 'https://dify.brius.com/v1/datasets/{dataset_id}/documents/{document_id}/segments/{segment_id}' \
--header 'Authorization: Bearer {api_key}'
```

## Error Handling and Troubleshooting

### HTTP Status Codes and Responses

**Common error codes:**

| Code | Status | Message | Solution |
|------|--------|---------|----------|
| `no_file_uploaded` | 400 | Please upload your file | Include file in form data |
| `too_many_files` | 400 | Only one file is allowed | Upload files individually |
| `file_too_large` | 413 | File size exceeded | Check `UPLOAD_FILE_SIZE_LIMIT` |
| `unsupported_file_type` | 415 | File type not allowed | Use supported formats |
| `dataset_not_initialized` | 400 | Dataset still being initialized | Wait for completion |
| `dataset_name_duplicate` | 409 | Dataset name already exists | Use unique name |
| `document_indexing` | 400 | Document being processed, cannot edit | Wait for indexing completion |
| `invalid_api_key` | 401 | Invalid API key format | Check Bearer token |
| `insufficient_quota` | 403 | API rate limit exceeded | Implement backoff strategy |

### Error Response Structure

**Validation error (400):**
```json
{
  "code": "invalid_param",
  "message": "Field required: indexing_technique",
  "status": 400,
  "details": {
    "field": "indexing_technique",
    "expected_values": ["high_quality", "economy"]
  }
}
```

**AWS Bedrock access error (403):**
```json
{
  "code": "AccessDeniedException", 
  "message": "Missing access permissions for Bedrock models",
  "status": 403,
  "details": {
    "required_permissions": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
  }
}
```

### Common Issues and Solutions

**Issue: ValidationException with Bedrock models**
- **Cause**: Models not enabled in AWS Bedrock console
- **Solution**: Enable required models in AWS console for your deployment region

**Issue: 504 Gateway Timeout on document upload**
- **Solution**: Increase timeout settings:
```bash
# In .env file
API_TOOL_DEFAULT_READ_TIMEOUT=3600
HTTP_REQUEST_MAX_READ_TIMEOUT=3600
NGINX_PROXY_READ_TIMEOUT=3600s
```

**Issue: Cohere Rerank 3.5 not available**
- **Cause**: Version compatibility or region availability
- **Solution**: Verify model availability in your AWS region and Dify version

### Production Error Handling

**Python implementation with comprehensive error handling:**
```python
import requests
import time
import logging
from requests.exceptions import RequestException

class DifyAPIClient:
    def __init__(self, base_url, api_key, max_retries=3):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        self.max_retries = max_retries
        self.logger = logging.getLogger(__name__)

    def robust_api_call(self, method, endpoint, data=None, files=None):
        """Production-ready API call with comprehensive error handling"""
        url = f"{self.base_url}/{endpoint}"
        
        for attempt in range(self.max_retries):
            try:
                if files:
                    # Remove Content-Type for file uploads
                    headers = {k: v for k, v in self.headers.items() 
                              if k != 'Content-Type'}
                    response = requests.request(method, url, headers=headers, 
                                              data=data, files=files, timeout=30)
                else:
                    response = requests.request(method, url, headers=self.headers, 
                                              json=data, timeout=30)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 204:
                    return {"success": True}
                elif response.status_code == 429:
                    wait_time = (2 ** attempt) + (attempt * 0.1)
                    self.logger.warning(f"Rate limited, waiting {wait_time}s")
                    time.sleep(wait_time)
                    continue
                elif response.status_code == 401:
                    raise ValueError("Invalid API key - check Bearer token format")
                elif response.status_code == 400:
                    error_details = response.json()
                    raise ValueError(f"Bad request: {error_details.get('message')}")
                else:
                    response.raise_for_status()
                    
            except RequestException as e:
                if attempt < self.max_retries - 1:
                    wait_time = 2 ** attempt
                    self.logger.warning(f"Request failed, retrying in {wait_time}s: {e}")
                    time.sleep(wait_time)
                else:
                    raise RuntimeError(f"API call failed after {self.max_retries} attempts: {e}")
        
        return None

    def create_knowledge_base(self, name, **kwargs):
        """Create a new knowledge base with error handling"""
        data = {"name": name, **kwargs}
        return self.robust_api_call("POST", "datasets", data)

    def upload_document(self, dataset_id, file_path, **kwargs):
        """Upload document with proper error handling"""
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'data': json.dumps(kwargs)}
            return self.robust_api_call("POST", 
                                      f"datasets/{dataset_id}/document/create_by_file",
                                      data=data, files=files)
```

## Best Practices

### Performance Optimization

**1. Embedding Model Selection:**
- Use Titan v2 with 512 dimensions for optimal balance of accuracy and storage efficiency
- Maintains 99% accuracy while reducing storage costs by 50%

**2. Chunking Strategy:**
- Use 500-1000 tokens per chunk for balanced retrieval performance
- Implement chunk overlap (50-100 tokens) to maintain context continuity
- Adjust based on document type: technical docs (800-1000), general content (400-600)

**3. Hybrid Search Configuration:**
- Set vector search weight to 0.7 and keyword search to 0.3 for most use cases
- Always enable Cohere 3.5 reranking with hybrid search for optimal results
- Use score threshold of 0.5-0.7 to filter low-quality results

**4. Retrieval Optimization:**
```bash
# Environment settings for optimal performance
RETRIEVAL_SCORE_THRESHOLD=0.6
RETRIEVAL_TOP_K=5
RAG_MAX_TOP_K=10
RERANKING_TOP_K=3
```

### Security Considerations

**1. API Key Management:**
- Store API keys securely using environment variables or secret management systems
- Never expose API keys in client-side code or version control
- Implement key rotation policies for production environments
- Use different API keys for different environments (dev, staging, prod)

**2. Access Control:**
- Use appropriate permission levels: `"only_me"`, `"all_team_members"`, `"partial_members"`
- Implement proper authorization checks in your applications
- Monitor API usage and implement rate limiting

**3. Data Security:**
```bash
# SSRF protection configuration
SSRF_PROXY_HTTP_URL=http://ssrf_proxy:3128
SSRF_PROXY_HTTPS_URL=http://ssrf_proxy:3128

# Content Security Policy
CSP_WHITELIST=https://dify.brius.com,https://api.openai.com
```

**4. Network Security:**
- Use HTTPS for all API communications
- Implement proper firewall rules for your Dify installation
- Enable SSL/TLS encryption for database connections

### Monitoring and Maintenance

**1. Performance Monitoring:**
- Track API response times and error rates
- Monitor vector database performance and storage usage
- Set up alerts for failed document processing

**2. Health Check Endpoints:**
```bash
# Check system health
curl --location 'https://dify.brius.com/health'

# Check database connectivity
curl --location 'https://dify.brius.com/v1/health/database' \
--header 'Authorization: Bearer {api_key}'
```

**3. Regular Maintenance Tasks:**
- Monitor and clean up failed document processing jobs
- Optimize vector database indexes periodically
- Review and update embedding models as newer versions become available
- Backup knowledge base configurations and metadata

**4. Usage Analytics:**
```bash
# Get knowledge base usage statistics
curl --location 'https://dify.brius.com/v1/datasets/{dataset_id}/analytics' \
--header 'Authorization: Bearer {api_key}'
```

## Production Deployment

### Infrastructure Requirements

**Minimum Production Setup:**
- **CPU**: 4+ cores for API service, 2+ cores for worker service
- **Memory**: 8GB+ for API service, 4GB+ for worker service
- **Storage**: 50GB+ for application, separate high-performance storage for vector database
- **Database**: PostgreSQL 15+ with connection pooling
- **Vector Database**: Weaviate/Qdrant with persistent storage

### Docker Compose Configuration

**Production-ready docker-compose.yml:**
```yaml
version: '3.8'
services:
  api:
    image: langgenius/dify-api:0.6.16
    restart: always
    environment:
      - EDITION=SELF_HOSTED
      - LOG_LEVEL=ERROR
      - DEBUG=false
      - FLASK_DEBUG=false
      - SECRET_KEY=${SECRET_KEY}
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_DATABASE=${DB_DATABASE}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - CELERY_BROKER_URL=${CELERY_BROKER_URL}
      - WEB_API_CORS_ALLOW_ORIGINS=${WEB_API_CORS_ALLOW_ORIGINS}
      - CONSOLE_CORS_ALLOW_ORIGINS=${CONSOLE_CORS_ALLOW_ORIGINS}
      - VECTOR_STORE=${VECTOR_STORE}
      - WEAVIATE_ENDPOINT=${WEAVIATE_ENDPOINT}
      - WEAVIATE_API_KEY=${WEAVIATE_API_KEY}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_BEDROCK_REGION=${AWS_BEDROCK_REGION}
    ports:
      - "5001:5001"
    depends_on:
      - db
      - redis
    volumes:
      - ./volumes/app/storage:/app/api/storage
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G

  worker:
    image: langgenius/dify-api:0.6.16
    restart: always
    command: celery -A app.celery worker -P gevent -c 1 --loglevel INFO -Q dataset,generation,mail
    environment:
      - EDITION=SELF_HOSTED
      - LOG_LEVEL=ERROR
      - DEBUG=false
      - SECRET_KEY=${SECRET_KEY}
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_DATABASE=${DB_DATABASE}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - CELERY_BROKER_URL=${CELERY_BROKER_URL}
      - VECTOR_STORE=${VECTOR_STORE}
      - WEAVIATE_ENDPOINT=${WEAVIATE_ENDPOINT}
      - WEAVIATE_API_KEY=${WEAVIATE_API_KEY}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_BEDROCK_REGION=${AWS_BEDROCK_REGION}
    depends_on:
      - db
      - redis
    volumes:
      - ./volumes/app/storage:/app/api/storage
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  web:
    image: langgenius/dify-web:0.6.16
    restart: always
    environment:
      - CONSOLE_API_URL=${CONSOLE_API_URL}
      - APP_API_URL=${APP_API_URL}
    ports:
      - "3000:3000"

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=${DB_USERNAME}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_DATABASE}
      - PGDATA=/var/lib/postgresql/data/pgdata
    volumes:
      - ./volumes/db/data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  redis:
    image: redis:6-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - ./volumes/redis/data:/data
    ports:
      - "6379:6379"

  weaviate:
    image: semitechnologies/weaviate:1.22.4
    restart: always
    environment:
      - AUTHENTICATION_APIKEY_ENABLED=true
      - AUTHENTICATION_APIKEY_ALLOWED_KEYS=${WEAVIATE_API_KEY}
      - AUTHENTICATION_APIKEY_USERS=dify
      - AUTHORIZATION_ADMINLIST_ENABLED=true
      - AUTHORIZATION_ADMINLIST_USERS=dify
      - PERSISTENCE_DATA_PATH=/var/lib/weaviate
      - DEFAULT_VECTORIZER_MODULE=none
      - CLUSTER_HOSTNAME=node1
    volumes:
      - ./volumes/weaviate:/var/lib/weaviate
    ports:
      - "8080:8080"
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - api
      - web
```

### Environment Configuration

**Production .env file:**
```bash
# =============================================================================
# Dify Production Configuration
# =============================================================================

# Application Settings
EDITION=SELF_HOSTED
LOG_LEVEL=ERROR
DEBUG=false
FLASK_DEBUG=false

# Security
SECRET_KEY=your-super-secret-key-here
COOKIE_HTTPONLY=true
COOKIE_SAMESITE=Lax

# Database Configuration
DB_USERNAME=dify
DB_PASSWORD=your-secure-db-password
DB_HOST=db
DB_PORT=5432
DB_DATABASE=dify
SQLALCHEMY_POOL_SIZE=30
SQLALCHEMY_POOL_RECYCLE=3600

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password
REDIS_DB=0
SESSION_TYPE=redis
SESSION_REDIS_DB=0

# Celery Configuration
CELERY_BROKER_URL=redis://:your-secure-redis-password@redis:6379/1
CELERY_WORKER_AMOUNT=8
SERVER_WORKER_AMOUNT=4

# CORS Settings
CONSOLE_CORS_ALLOW_ORIGINS=https://dify.brius.com
WEB_API_CORS_ALLOW_ORIGINS=https://dify.brius.com

# File Upload Settings
UPLOAD_FILE_SIZE_LIMIT=50M
UPLOAD_FILE_BATCH_LIMIT=20

# Vector Database
VECTOR_STORE=weaviate
WEAVIATE_ENDPOINT=http://weaviate:8080
WEAVIATE_API_KEY=your-weaviate-api-key
WEAVIATE_BATCH_SIZE=100
WEAVIATE_GRPC_ENABLED=true

# AWS Bedrock Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_BEDROCK_REGION=us-east-1

# API Timeouts
API_TOOL_DEFAULT_READ_TIMEOUT=3600
HTTP_REQUEST_MAX_READ_TIMEOUT=3600

# Security Headers
CSP_WHITELIST=https://dify.brius.com
SSRF_PROXY_HTTP_URL=http://ssrf_proxy:3128
SSRF_PROXY_HTTPS_URL=http://ssrf_proxy:3128

# Application URLs
CONSOLE_API_URL=https://dify.brius.com
APP_API_URL=https://dify.brius.com
```

### Nginx Configuration

**Production nginx.conf:**
```nginx
user nginx;
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web:10m rate=5r/s;

    # Upstream configurations
    upstream api_backend {
        server api:5001;
        keepalive 32;
    }

    upstream web_backend {
        server web:3000;
        keepalive 32;
    }

    # HTTPS Redirect
    server {
        listen 80;
        server_name dify.brius.com;
        return 301 https://$server_name$request_uri;
    }

    # Main HTTPS Server
    server {
        listen 443 ssl http2;
        server_name dify.brius.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # API Routes
        location /v1 {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 3600s;
            proxy_connect_timeout 60s;
            proxy_send_timeout 3600s;
        }

        location /console/api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 3600s;
            proxy_connect_timeout 60s;
            proxy_send_timeout 3600s;
        }

        # Web Application
        location / {
            limit_req zone=web burst=10 nodelay;
            proxy_pass http://web_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health Check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### Scaling Considerations

**Horizontal Scaling:**
1. **API Service**: Scale multiple API instances behind load balancer
2. **Worker Service**: Scale worker instances based on processing load
3. **Database**: Use read replicas for read-heavy workloads
4. **Vector Database**: Configure clustering for large-scale deployments

**Performance Tuning:**
```bash
# Worker scaling based on load
CELERY_WORKER_AMOUNT=16  # Increase for high document processing load
SERVER_WORKER_AMOUNT=8   # Scale based on API request volume

# Database optimization
SQLALCHEMY_POOL_SIZE=50
SQLALCHEMY_POOL_RECYCLE=1800
SQLALCHEMY_ENGINE_OPTIONS={"pool_pre_ping": true}

# Vector database optimization
WEAVIATE_BATCH_SIZE=200
WEAVIATE_TIMEOUT=60
```

### Backup and Recovery

**Database Backup:**
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/postgres"
mkdir -p $BACKUP_DIR

# Backup database
docker exec dify_db pg_dump -U dify dify > $BACKUP_DIR/dify_$DATE.sql

# Backup vector database
docker exec dify_weaviate /bin/sh -c "cd /var/lib/weaviate && tar czf - ." > $BACKUP_DIR/weaviate_$DATE.tar.gz

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

**Recovery Process:**
```bash
# Restore database
docker exec -i dify_db psql -U dify dify < backup/dify_20240115_120000.sql

# Restore vector database
docker stop dify_weaviate
tar xzf backup/weaviate_20240115_120000.tar.gz -C ./volumes/weaviate/
docker start dify_weaviate
```

## Conclusion

This comprehensive guide provides everything needed to effectively manage Dify 1.4.x knowledge bases using REST APIs in a production environment. The combination of Amazon Bedrock Titan v2 embeddings and Cohere 3.5 reranking delivers state-of-the-art RAG performance with enterprise-grade reliability.

**Key takeaways:**
- Use hybrid search with proper weight distribution for optimal retrieval accuracy
- Implement comprehensive error handling and monitoring for production stability
- Configure appropriate security measures including API key management and CORS policies
- Scale infrastructure components based on usage patterns and performance requirements
- Regular maintenance and monitoring ensure optimal performance over time

The integration with AWS Bedrock provides access to cutting-edge AI models while maintaining full control over your data in a self-hosted environment. This setup is ideal for organizations requiring high-performance document retrieval with enterprise security and compliance requirements.