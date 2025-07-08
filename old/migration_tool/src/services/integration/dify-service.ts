import { config } from '../../utils/config';
import { logger } from '../../utils/logger';
import axios, { AxiosInstance, AxiosError } from '../../../$node_modules/axios/index.js';
import {
  DifyDataset,
  DifyDocument,
  DifyDocumentSegment,
  CreateDatasetRequest,
  CreateDocumentByTextRequest,
  DifyApiResponse,
  DifyErrorResponse,
  DifySearchRequest,
  DifySearchResult,
  DifyBatchOperationResult,
  DifyServiceHealth,
  DifyRetryConfig,
  DifyContentType,
  DifyOperationResult
} from './dify-service.types';

/**
 * @class DifyService
 * @description Enhanced Dify Knowledge Base API integration service.
 * Provides comprehensive knowledge base management, document operations,
 * search capabilities, and robust error handling with retry logic.
 * Designed to work alongside Amazon Bedrock for dual-path AI embeddings.
 */
export class DifyService {
  private readonly client: AxiosInstance;
  private readonly retryConfig: DifyRetryConfig;
  private healthStatus: DifyServiceHealth;

  constructor() {
    // Add comprehensive logging for configuration validation
    logger.info('Initializing Dify service with configuration:', {
      baseUrl: config.dify.baseUrl,
      apiKeyPresent: !!config.dify.apiKey,
      apiKeyLength: config.dify.apiKey?.length || 0,
      enabled: config.dify.enabled
    });

    this.client = axios.create({
      baseURL: config.dify.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.dify.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: config.dify.timeoutMs || 30000,
    });

    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    };

    this.healthStatus = {
      isHealthy: false,
      responseTime: 0,
      lastChecked: new Date(),
      error: undefined
    };

    // Setup request/response interceptors for logging and error handling
    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for request/response logging and error handling
   */
  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Dify API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: { ...config.headers, Authorization: '[REDACTED]' }
        });
        return config;
      },
      (error) => {
        logger.error('Dify API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Dify API Response:', {
          status: response.status,
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length
        });
        return response;
      },
      (error) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Handle API errors with detailed logging
   */
  private handleApiError(error: AxiosError): void {
    if (error.response) {
      const difyError = error.response.data as DifyErrorResponse;
      logger.error('Dify API Error Response:', {
        status: error.response.status,
        code: difyError.code,
        message: difyError.message,
        url: error.config?.url
      });
    } else if (error.request) {
      logger.error('Dify API Network Error:', {
        message: error.message,
        url: error.config?.url
      });
    } else {
      logger.error('Dify API Request Setup Error:', error.message);
    }
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        logger.debug(`Executing Dify operation: ${operationName} (attempt ${attempt}/${this.retryConfig.maxAttempts})`);
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`Dify operation ${operationName} succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.retryConfig.maxAttempts) {
          logger.error(`Dify operation ${operationName} failed after ${attempt} attempts:`, lastError);
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        );

        logger.warn(`Dify operation ${operationName} failed on attempt ${attempt}, retrying in ${delay}ms:`, lastError.message);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check service health
   */
  public async checkHealth(): Promise<DifyServiceHealth> {
    const startTime = Date.now();
    
    try {
      logger.debug('Performing Dify health check', {
        baseURL: this.client.defaults.baseURL,
        endpoint: '/datasets'
      });
      
      const response = await this.client.get('/datasets', { timeout: 5000 });
      
      this.healthStatus = {
        isHealthy: true,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: undefined
      };
      
      logger.debug('Dify service health check passed', {
        responseTime: this.healthStatus.responseTime,
        status: response.status
      });
    } catch (error) {
      this.healthStatus = {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: (error as Error).message
      };
      
      logger.warn('Dify service health check failed:', {
        error: (error as Error).message,
        responseTime: this.healthStatus.responseTime,
        baseURL: this.client.defaults.baseURL
      });
    }

    return this.healthStatus;
  }

  /**
   * Get current service health status
   */
  public getHealthStatus(): DifyServiceHealth {
    return { ...this.healthStatus };
  }

  /**
   * List all datasets
   */
  public async listDatasets(): Promise<DifyDataset[]> {
    return this.executeWithRetry(async () => {
      logger.debug('Making request to list datasets', {
        url: '/datasets',
        baseURL: this.client.defaults.baseURL
      });
      
      const response = await this.client.get<DifyApiResponse<DifyDataset[]>>('/datasets');
      
      logger.debug('List datasets response received:', {
        status: response.status,
        dataLength: response.data?.data?.length || 0
      });
      
      return response.data.data;
    }, 'listDatasets');
  }

  /**
   * Find dataset by name
   */
  public async findDatasetByName(name: string): Promise<DifyDataset | null> {
    return this.executeWithRetry(async () => {
      const datasets = await this.listDatasets();
      return datasets.find(dataset => dataset.name === name) || null;
    }, `findDatasetByName:${name}`);
  }

  /**
   * Create a new dataset with Bedrock configuration
   */
  public async createDataset(name: string, description?: string): Promise<DifyDataset> {
    return this.executeWithRetry(async () => {
      // Updated request structure based on Dify 1.4.x documentation
      const createRequest = {
        name,
        permission: 'only_me',
        indexing_technique: 'high_quality',
        embedding_model_provider: 'bedrock',
        embedding_model: 'amazon.titan-embed-text-v2:0',
        retrieval_model: {
          search_method: 'hybrid_search',
          reranking_enable: true,
          reranking_mode: 'reranking_model',
          reranking_model: {
            reranking_provider_name: 'bedrock',
            reranking_model_name: 'cohere.rerank-v3-5:0'
          },
          weights: {
            vector_search: 0.7,
            keyword_search: 0.3
          },
          top_k: 5,
          score_threshold_enabled: true,
          score_threshold: 0.6
        }
      };

      logger.info('Creating Dify dataset with request:', {
        name,
        description,
        requestStructure: JSON.stringify(createRequest, null, 2)
      });

      const response = await this.client.post<DifyDataset>('/datasets', createRequest);
      
      logger.info(`Successfully created Dify dataset "${name}"`, {
        id: response.data.id,
        status: response.status,
        responseData: response.data
      });
      
      return response.data;
    }, `createDataset:${name}`);
  }

  /**
   * Find or create dataset by name
   */
  public async findOrCreateDataset(name: string, description?: string): Promise<string> {
    return this.executeWithRetry(async () => {
      logger.info(`Searching for Dify dataset with name: "${name}"...`);
      
      const existingDataset = await this.findDatasetByName(name);
      
      if (existingDataset) {
        logger.info(`Found existing Dify dataset "${name}" with ID: ${existingDataset.id}`);
        return existingDataset.id;
      }

      logger.info(`No Dify dataset named "${name}" found. Creating a new one with Bedrock configuration.`);
      const newDataset = await this.createDataset(name, description);
      return newDataset.id;
    }, `findOrCreateDataset:${name}`);
  }

  /**
   * Get dataset by ID
   */
  public async getDataset(datasetId: string): Promise<DifyDataset> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get<DifyDataset>(`/datasets/${datasetId}`);
      return response.data;
    }, `getDataset:${datasetId}`);
  }

  /**
   * Delete dataset
   */
  public async deleteDataset(datasetId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.client.delete(`/datasets/${datasetId}`);
      logger.info(`Successfully deleted Dify dataset with ID: ${datasetId}`);
    }, `deleteDataset:${datasetId}`);
  }

  /**
   * List documents in a dataset
   */
  public async listDocuments(datasetId: string, page = 1, limit = 20): Promise<DifyApiResponse<DifyDocument[]>> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get<DifyApiResponse<DifyDocument[]>>(
        `/datasets/${datasetId}/documents`,
        { params: { page, limit } }
      );
      return response.data;
    }, `listDocuments:${datasetId}`);
  }

  /**
   * Create document from text
   */
  public async addDocumentByText(
    datasetId: string,
    documentName: string,
    text: string,
    indexingTechnique: 'high_quality' | 'economy' = 'high_quality'
  ): Promise<DifyDocument> {
    return this.executeWithRetry(async () => {
      logger.info(`Adding document "${documentName}" to Dify dataset ${datasetId}`, {
        datasetId,
        documentName,
        textLength: text.length,
        indexingTechnique
      });
      
      const createRequest: CreateDocumentByTextRequest = {
        name: documentName,
        text,
        indexing_technique: indexingTechnique,
        process_rule: { mode: 'automatic' }
      };

      logger.debug('Document creation request payload:', {
        requestStructure: JSON.stringify(createRequest, null, 2)
      });

      const response = await this.client.post<DifyDocument>(
        `/datasets/${datasetId}/document/create_by_text`,
        createRequest
      );
      
      logger.info(`Successfully added document "${documentName}"`, {
        documentId: response.data.id,
        status: response.status,
        indexingStatus: response.data.indexing_status
      });
      
      return response.data;
    }, `addDocumentByText:${documentName}`);
  }

  /**
   * Get document by ID
   */
  public async getDocument(datasetId: string, documentId: string): Promise<DifyDocument> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get<DifyDocument>(
        `/datasets/${datasetId}/documents/${documentId}`
      );
      return response.data;
    }, `getDocument:${documentId}`);
  }

  /**
   * Update document
   */
  public async updateDocument(
    datasetId: string,
    documentId: string,
    name?: string,
    text?: string
  ): Promise<DifyDocument> {
    return this.executeWithRetry(async () => {
      logger.info('Updating document', { datasetId, documentId, name, textLength: text?.length });
      
      const updateData: Partial<CreateDocumentByTextRequest> = {};
      if (name) updateData.name = name;
      if (text) updateData.text = text;

      const response = await this.client.post<DifyDocument>(
        `/datasets/${datasetId}/documents/${documentId}/update_by_text`,
        updateData
      );
      
      logger.info(`Successfully updated document ${documentId}`, {
        status: response.status,
        documentName: response.data.name
      });
      return response.data;
    }, `updateDocument:${documentId}`);
  }

  /**
   * Delete document
   */
  public async deleteDocument(datasetId: string, documentId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.client.delete(`/datasets/${datasetId}/documents/${documentId}`);
      logger.info(`Successfully deleted document ${documentId} from dataset ${datasetId}`);
    }, `deleteDocument:${documentId}`);
  }

  /**
   * Get document segments
   */
  public async getDocumentSegments(
    datasetId: string,
    documentId: string,
    page = 1,
    limit = 20
  ): Promise<DifyApiResponse<DifyDocumentSegment[]>> {
    return this.executeWithRetry(async () => {
      logger.debug('Getting document segments', { datasetId, documentId, page, limit });
      const response = await this.client.get<DifyApiResponse<DifyDocumentSegment[]>>(
        `/datasets/${datasetId}/documents/${documentId}/segments`,
        { params: { page, limit } }
      );
      logger.debug('Document segments retrieved', {
        datasetId,
        documentId,
        segmentCount: response.data.data?.length || 0
      });
      return response.data;
    }, `getDocumentSegments:${documentId}`);
  }

  /**
   * Search within a dataset
   */
  public async searchDataset(
    datasetId: string, 
    query: string,
    searchOptions?: Partial<DifySearchRequest>
  ): Promise<DifySearchResult[]> {
    return this.executeWithRetry(async () => {
      const searchRequest: DifySearchRequest = {
        query,
        retrieval_model: {
          search_method: 'hybrid_search',
          reranking_enable: false,
          weights: {
            vector_search: 0.7,
            keyword_search: 0.3
          },
          top_k: 5,
          score_threshold_enabled: true,
          score_threshold: 0.5,
          ...searchOptions?.retrieval_model
        }
      };

      const response = await this.client.post<DifyApiResponse<DifySearchResult[]>>(
        `/datasets/${datasetId}/retrieve`,
        searchRequest
      );
      
      return response.data.data;
    }, `searchDataset:${datasetId}`);
  }

  /**
   * Batch add documents to a dataset
   */
  public async batchAddDocuments(
    datasetId: string,
    documents: Array<{ name: string; text: string }>
  ): Promise<DifyBatchOperationResult> {
    const result: DifyBatchOperationResult = {
      successful: 0,
      failed: 0,
      errors: []
    };

    logger.info(`Starting batch add of ${documents.length} documents to dataset ${datasetId}`);

    for (const doc of documents) {
      try {
        await this.addDocumentByText(datasetId, doc.name, doc.text);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          item: doc.name,
          error: (error as Error).message
        });
        logger.error(`Failed to add document ${doc.name}:`, error);
      }
    }

    logger.info(`Batch operation completed: ${result.successful} successful, ${result.failed} failed`);
    return result;
  }

  /**
   * Get dataset for specific content type
   */
  public async getDatasetForContentType(contentType: DifyContentType): Promise<string> {
    const datasetName = `${contentType}_knowledge_base`;
    return this.findOrCreateDataset(datasetName, `Knowledge base for ${contentType} content`);
  }

  /**
   * Add content to appropriate knowledge base
   */
  public async addContentToKnowledgeBase(
    contentType: DifyContentType,
    documentName: string,
    content: string
  ): Promise<DifyOperationResult<DifyDocument>> {
    const operationId = `${contentType}_${documentName}_${Date.now()}`;
    
    try {
      logger.info(`Adding ${contentType} content to Dify knowledge base: ${documentName}`);
      
      const datasetId = await this.getDatasetForContentType(contentType);
      const document = await this.addDocumentByText(datasetId, documentName, content);
      
      return {
        status: 'completed',
        data: document,
        timestamp: new Date(),
        operationId
      };
    } catch (error) {
      logger.error(`Failed to add ${contentType} content to Dify:`, error);
      
      return {
        status: 'failed',
        error: (error as Error).message,
        timestamp: new Date(),
        operationId
      };
    }
  }

  /**
   * Search across all knowledge bases
   */
  public async searchAllKnowledgeBases(
    query: string,
    contentTypes: DifyContentType[] = ['cases', 'patients', 'notes']
  ): Promise<Record<DifyContentType, DifySearchResult[]>> {
    const results: Record<string, DifySearchResult[]> = {};
    
    await Promise.allSettled(
      contentTypes.map(async (contentType) => {
        try {
          const datasetId = await this.getDatasetForContentType(contentType);
          const searchResults = await this.searchDataset(datasetId, query);
          results[contentType] = searchResults;
        } catch (error) {
          logger.error(`Failed to search ${contentType} knowledge base:`, error);
          results[contentType] = [];
        }
      })
    );

    return results as Record<DifyContentType, DifySearchResult[]>;
  }

  /**
   * Get service statistics
   */
  public async getServiceStatistics(): Promise<{
    totalDatasets: number;
    totalDocuments: number;
    healthStatus: DifyServiceHealth;
  }> {
    try {
      const datasets = await this.listDatasets();
      let totalDocuments = 0;

      for (const dataset of datasets) {
        totalDocuments += dataset.document_count;
      }

      return {
        totalDatasets: datasets.length,
        totalDocuments,
        healthStatus: await this.checkHealth()
      };
    } catch (error) {
      logger.error('Failed to get Dify service statistics:', error);
      throw error;
    }
  }
}

export const difyService = new DifyService();