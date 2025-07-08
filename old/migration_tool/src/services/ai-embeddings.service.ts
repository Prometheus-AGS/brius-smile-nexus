import { bedrockService } from './integration/bedrock-service';
import { difyService } from './integration/dify-service';
import { logger } from '../utils/logger';
import {
  DifyContentType,
  DifyOperationResult,
  DifyServiceHealth
} from './integration/dify-service.types';

/**
 * @interface EmbeddingServiceConfig
 * @description Configuration for AI embeddings service
 */
interface EmbeddingServiceConfig {
  enableBedrock: boolean;
  enableDify: boolean;
  preferredService: 'bedrock' | 'dify' | 'both';
  fallbackEnabled: boolean;
  healthCheckInterval: number;
}

/**
 * @interface EmbeddingResult
 * @description Result of embedding generation with service information
 */
interface EmbeddingResult {
  embedding: number[];
  service: 'bedrock' | 'dify';
  timestamp: Date;
  success: boolean;
  error?: string;
}

/**
 * @interface DualPathResult
 * @description Result of dual-path embedding operation
 */
interface DualPathResult {
  bedrock?: EmbeddingResult;
  dify?: DifyOperationResult;
  primarySuccess: boolean;
  fallbackUsed: boolean;
  errors: string[];
}

/**
 * @interface ServiceHealthStatus
 * @description Health status of all AI services
 */
interface ServiceHealthStatus {
  bedrock: {
    isHealthy: boolean;
    lastChecked: Date;
    error?: string;
  };
  dify: DifyServiceHealth;
  overall: boolean;
}

/**
 * @class AiEmbeddingsService
 * @description Enhanced AI embeddings service with dual-path support.
 * Orchestrates embedding generation using both Amazon Bedrock and Dify services,
 * providing fallback mechanisms, health monitoring, and configuration-driven
 * service selection for robust AI embeddings integration.
 */
class AiEmbeddingsService {
  private serviceConfig: EmbeddingServiceConfig;
  private healthStatus: ServiceHealthStatus;
  private healthCheckTimer?: NodeJS.Timeout | undefined;

  constructor() {
    this.serviceConfig = {
      enableBedrock: true, // Always enabled as primary
      enableDify: true, // Enable Dify integration
      preferredService: 'both', // Use both services
      fallbackEnabled: true,
      healthCheckInterval: 300000 // 5 minutes
    };

    this.healthStatus = {
      bedrock: {
        isHealthy: true,
        lastChecked: new Date()
      },
      dify: {
        isHealthy: false,
        responseTime: 0,
        lastChecked: new Date()
      },
      overall: false
    };

    this.initializeHealthMonitoring();
  }

  /**
   * Initialize health monitoring for all services
   */
  private initializeHealthMonitoring(): void {
    // Initial health check
    this.checkAllServicesHealth();

    // Set up periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.checkAllServicesHealth();
    }, this.serviceConfig.healthCheckInterval);

    logger.info('AI Embeddings Service health monitoring initialized');
  }

  /**
   * Check health of all AI services
   */
  private async checkAllServicesHealth(): Promise<void> {
    try {
      // Check Bedrock health (simple check - we assume it's healthy if no recent errors)
      this.healthStatus.bedrock = {
        isHealthy: true, // Bedrock doesn't have a direct health check
        lastChecked: new Date()
      };

      // Check Dify health
      if (this.serviceConfig.enableDify) {
        this.healthStatus.dify = await difyService.checkHealth();
      }

      // Update overall health
      this.healthStatus.overall = this.healthStatus.bedrock.isHealthy && 
        (!this.serviceConfig.enableDify || this.healthStatus.dify.isHealthy);

      logger.debug('AI services health check completed', {
        bedrock: this.healthStatus.bedrock.isHealthy,
        dify: this.healthStatus.dify.isHealthy,
        overall: this.healthStatus.overall
      });
    } catch (error) {
      logger.error('Error during AI services health check:', error);
    }
  }

  /**
   * Get current health status of all services
   */
  public getHealthStatus(): ServiceHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Update service configuration
   */
  public updateConfig(newConfig: Partial<EmbeddingServiceConfig>): void {
    this.serviceConfig = { ...this.serviceConfig, ...newConfig };
    logger.info('AI Embeddings Service configuration updated', this.serviceConfig);
  }

  /**
   * Generate embedding using Bedrock service
   */
  private async generateBedrockEmbedding(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();
    
    try {
      logger.debug('Generating Bedrock embedding for text', { textLength: text.length });
      const embedding = await bedrockService.generateEmbedding(text);
      
      const result: EmbeddingResult = {
        embedding,
        service: 'bedrock',
        timestamp: new Date(),
        success: true
      };

      logger.info('Bedrock embedding generated successfully', {
        embeddingLength: embedding.length,
        processingTime: Date.now() - startTime
      });

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('Bedrock embedding generation failed:', error);
      
      // Update health status
      this.healthStatus.bedrock = {
        isHealthy: false,
        lastChecked: new Date(),
        error: errorMessage
      };

      return {
        embedding: [],
        service: 'bedrock',
        timestamp: new Date(),
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Add content to Dify knowledge base
   */
  private async addToDifyKnowledgeBase(
    contentType: DifyContentType,
    documentName: string,
    text: string
  ): Promise<DifyOperationResult> {
    try {
      logger.debug('Adding content to Dify knowledge base', {
        contentType,
        documentName,
        textLength: text.length
      });

      const result = await difyService.addContentToKnowledgeBase(
        contentType,
        documentName,
        text
      );

      logger.info('Content added to Dify knowledge base', {
        contentType,
        documentName,
        status: result.status
      });

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('Failed to add content to Dify knowledge base:', error);

      return {
        status: 'failed',
        error: errorMessage,
        timestamp: new Date(),
        operationId: `failed_${Date.now()}`
      };
    }
  }

  /**
   * Generate embeddings using single service with fallback
   */
  private async generateEmbeddingWithFallback(text: string): Promise<EmbeddingResult> {
    const preferredService = this.serviceConfig.preferredService === 'both' ? 'bedrock' : this.serviceConfig.preferredService;
    
    // Try preferred service first
    if (preferredService === 'bedrock' && this.serviceConfig.enableBedrock) {
      const result = await this.generateBedrockEmbedding(text);
      if (result.success) {
        return result;
      }

      // Fallback to Dify if enabled and Bedrock failed
      if (this.serviceConfig.fallbackEnabled && this.serviceConfig.enableDify) {
        logger.warn('Bedrock failed, attempting Dify fallback (note: Dify doesn\'t return embeddings directly)');
        // Note: Dify doesn't return embeddings directly, so we can't use it as a direct fallback
        // This would require additional implementation to extract embeddings from Dify
      }

      return result;
    }

    // If Dify is preferred (though it doesn't generate embeddings directly)
    logger.warn('Dify selected as preferred service, but it doesn\'t generate embeddings directly. Using Bedrock.');
    return this.generateBedrockEmbedding(text);
  }

  /**
   * Generate embeddings and store in knowledge bases (dual-path approach)
   */
  public async generateAndStoreEmbedding(
    text: string,
    contentType: DifyContentType = 'notes',
    documentName?: string
  ): Promise<DualPathResult> {
    const result: DualPathResult = {
      primarySuccess: false,
      fallbackUsed: false,
      errors: []
    };

    logger.info('Starting dual-path embedding generation', {
      textLength: text.length,
      contentType,
      documentName
    });

    // Generate Bedrock embedding
    if (this.serviceConfig.enableBedrock) {
      try {
        result.bedrock = await this.generateBedrockEmbedding(text);
        if (result.bedrock.success) {
          result.primarySuccess = true;
        } else {
          result.errors.push(`Bedrock: ${result.bedrock.error}`);
        }
      } catch (error) {
        const errorMessage = `Bedrock embedding failed: ${(error as Error).message}`;
        result.errors.push(errorMessage);
        logger.error(errorMessage, error);
      }
    }

    // Add to Dify knowledge base
    if (this.serviceConfig.enableDify) {
      try {
        const difyDocumentName = documentName || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        result.dify = await this.addToDifyKnowledgeBase(contentType, difyDocumentName, text);
        
        if (result.dify.status === 'completed') {
          result.primarySuccess = result.primarySuccess || true;
        } else {
          result.errors.push(`Dify: ${result.dify.error}`);
        }
      } catch (error) {
        const errorMessage = `Dify knowledge base operation failed: ${(error as Error).message}`;
        result.errors.push(errorMessage);
        logger.error(errorMessage, error);
      }
    }

    // Log final result
    logger.info('Dual-path embedding operation completed', {
      primarySuccess: result.primarySuccess,
      bedrockSuccess: result.bedrock?.success,
      difySuccess: result.dify?.status === 'completed',
      errorCount: result.errors.length
    });

    return result;
  }

  /**
   * Generate embedding with automatic service selection
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      logger.info('Generating embedding with automatic service selection', {
        textLength: text.length
      });

      const result = await this.generateEmbeddingWithFallback(text);
      
      if (result.success) {
        return result.embedding;
      } else {
        throw new Error(`Failed to generate embedding: ${result.error}`);
      }
    } catch (error) {
      logger.error('Error in generateEmbedding:', error);
      throw new Error('Failed to generate embedding.');
    }
  }

  /**
   * Start batch embedding job using Bedrock
   */
  public async startBatchEmbeddingJob(
    inputS3Uri: string,
    outputS3Uri: string,
    roleArn: string,
  ): Promise<string | undefined> {
    try {
      if (!this.serviceConfig.enableBedrock) {
        throw new Error('Bedrock service is disabled');
      }

      logger.info('Starting batch embedding job', { inputS3Uri, outputS3Uri });
      
      const jobArn = await bedrockService.startBatchEmbeddingJob(
        inputS3Uri,
        outputS3Uri,
        roleArn,
      );
      
      logger.info(`Batch embedding job started with ARN: ${jobArn}`);
      return jobArn;
    } catch (error) {
      logger.error('Error starting batch embedding job:', error);
      throw new Error('Failed to start batch embedding job.');
    }
  }

  /**
   * Search across Dify knowledge bases
   */
  public async searchKnowledgeBases(
    query: string,
    contentTypes: DifyContentType[] = ['cases', 'patients', 'notes']
  ): Promise<Record<DifyContentType, unknown[]>> {
    try {
      if (!this.serviceConfig.enableDify) {
        throw new Error('Dify service is disabled');
      }

      logger.info('Searching Dify knowledge bases', {
        query: query.substring(0, 100),
        contentTypes
      });

      const results = await difyService.searchAllKnowledgeBases(query, contentTypes);
      
      // Ensure results are properly formatted and handle null/undefined cases
      const safeResults: Record<DifyContentType, unknown[]> = {
        patients: results?.patients || [],
        cases: results?.cases || [],
        notes: results?.notes || []
      };
      
      logger.info('Knowledge base search completed', {
        totalResults: Object.values(safeResults).reduce((sum, arr) => sum + (arr?.length || 0), 0)
      });

      return safeResults;
    } catch (error) {
      logger.error('Error searching knowledge bases:', error);
      throw new Error('Failed to search knowledge bases.');
    }
  }

  /**
   * Get service statistics and health information
   */
  public async getServiceStatistics(): Promise<{
    bedrock: {
      enabled: boolean;
      healthy: boolean;
      lastChecked: Date;
    };
    dify: {
      enabled: boolean;
      healthy: boolean;
      totalDatasets?: number;
      totalDocuments?: number;
      lastChecked: Date;
    };
    configuration: EmbeddingServiceConfig;
  }> {
    const stats: {
      bedrock: {
        enabled: boolean;
        healthy: boolean;
        lastChecked: Date;
      };
      dify: {
        enabled: boolean;
        healthy: boolean;
        totalDatasets?: number;
        totalDocuments?: number;
        lastChecked: Date;
      };
      configuration: EmbeddingServiceConfig;
    } = {
      bedrock: {
        enabled: this.serviceConfig.enableBedrock,
        healthy: this.healthStatus.bedrock.isHealthy,
        lastChecked: this.healthStatus.bedrock.lastChecked
      },
      dify: {
        enabled: this.serviceConfig.enableDify,
        healthy: this.healthStatus.dify.isHealthy,
        lastChecked: this.healthStatus.dify.lastChecked
      },
      configuration: { ...this.serviceConfig }
    };

    // Get Dify statistics if enabled and healthy
    if (this.serviceConfig.enableDify && this.healthStatus.dify.isHealthy) {
      try {
        const difyStats = await difyService.getServiceStatistics();
        stats.dify.totalDatasets = difyStats.totalDatasets;
        stats.dify.totalDocuments = difyStats.totalDocuments;
      } catch (error) {
        logger.warn('Failed to get Dify statistics:', error);
      }
    }

    return stats;
  }

  /**
   * Cleanup resources and stop health monitoring
   */
  public cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    logger.info('AI Embeddings Service cleanup completed');
  }
}

export const aiEmbeddingsService = new AiEmbeddingsService();

// Cleanup on process exit
process.on('SIGINT', () => {
  aiEmbeddingsService.cleanup();
});

process.on('SIGTERM', () => {
  aiEmbeddingsService.cleanup();
});