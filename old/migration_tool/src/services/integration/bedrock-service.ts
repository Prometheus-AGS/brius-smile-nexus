import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '../../../$node_modules/@aws-sdk/client-bedrock-runtime/dist-types/index.js';
import {
  BedrockClient,
  CreateModelInvocationJobCommand,
} from '../../../$node_modules/@aws-sdk/client-bedrock/dist-types/index.js';
import { config } from '../../utils/config';
import { logger } from '../../utils/logger';
import {
  EmbeddingRequestBody,
  EmbeddingResponseBody,
} from './bedrock-service.types';

/**
 * @class BedrockService
 * @description A service class for interacting with Amazon Bedrock for AI-powered embeddings.
 * This class encapsulates the logic for real-time and batch embedding generation,
 * providing a centralized interface for all Bedrock-related operations.
 */
class BedrockService {
  private bedrockRuntimeClient: BedrockRuntimeClient;
  private bedrockClient: BedrockClient;
  private readonly modelId: string = 'amazon.titan-embed-text-v2:0';

  constructor() {
    this.bedrockRuntimeClient = new BedrockRuntimeClient({
      region: config.aws.bedrock.region,
    });
    this.bedrockClient = new BedrockClient({
      region: config.aws.bedrock.region,
    });
  }

  /**
   * Generates a vector embedding for a given text using Amazon Bedrock's real-time invocation.
   * This method is suitable for generating embeddings for single documents or small batches of text.
   *
   * @param {string} text - The input text to be embedded.
   * @returns {Promise<number[]>} A promise that resolves to an array of numbers representing the vector embedding.
   * @throws {Error} Throws an error if the embedding generation fails.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    logger.info(`Generating embedding for text snippet...`);
    const payload: EmbeddingRequestBody = {
      inputText: text,
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    try {
      const response = await this.bedrockRuntimeClient.send(command);
      const decodedResponseBody = new TextDecoder().decode(response.body);
      const responseBody: EmbeddingResponseBody =
        JSON.parse(decodedResponseBody);
      logger.info('Successfully generated embedding.');
      return responseBody.embedding;
    } catch (error) {
      logger.error('Error generating embedding:', {
        error,
        textLength: text.length,
      });
      throw new Error('Failed to generate embedding.');
    }
  }

  /**
   * Starts a batch inference job in Amazon Bedrock for generating embeddings from a large dataset.
   * This method is designed for bulk processing of data stored in S3.
   *
   * @param {string} inputS3Uri - The S3 URI of the input data (JSONL file).
   * @param {string} outputS3Uri - The S3 URI where the output embeddings will be stored.
   * @param {string} roleArn - The ARN of the IAM role with permissions to run the batch job.
   * @returns {Promise<string | undefined>} A promise that resolves to the ARN of the created job, or undefined if the job creation fails.
   * @throws {Error} Throws an error if the batch job creation fails.
   */
  public async startBatchEmbeddingJob(
    inputS3Uri: string,
    outputS3Uri: string,
    roleArn: string,
  ): Promise<string | undefined> {
    logger.info(`Starting batch embedding job from S3 bucket: ${inputS3Uri}`);
    const command = new CreateModelInvocationJobCommand({
      jobName: `embedding-job-${Date.now()}`,
      modelId: this.modelId,
      roleArn: roleArn,
      inputDataConfig: {
        s3InputDataConfig: {
          s3Uri: inputS3Uri,
        },
      },
      outputDataConfig: {
        s3OutputDataConfig: {
          s3Uri: outputS3Uri,
        },
      },
    });

    try {
      const response = await this.bedrockClient.send(command);
      logger.info(`Batch job started successfully. Job ARN: ${response.jobArn}`);
      return response.jobArn;
    } catch (error) {
      logger.error('Error starting batch embedding job:', { error, inputS3Uri });
      throw new Error('Failed to start batch embedding job.');
    }
  }
}

export const bedrockService = new BedrockService();