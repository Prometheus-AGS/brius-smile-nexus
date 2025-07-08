/**
 * @file This file contains the type definitions for the Bedrock service.
 */

/**
 * @interface EmbeddingRequestBody
 * @description Represents the request body for generating an embedding.
 */
export interface EmbeddingRequestBody {
  inputText: string;
}

/**
 * @interface EmbeddingResponseBody
 * @description Represents the response body for a generated embedding.
 */
export interface EmbeddingResponseBody {
  embedding: number[];
}

/**
 * @interface BatchEmbeddingRequest
 * @description Represents a request to start a batch embedding job.
 */
export interface BatchEmbeddingRequest {
  inputS3Uri: string;
  outputS3Uri: string;
  roleArn: string;
}

/**
 * @interface BatchEmbeddingResponse
 * @description Represents the response for a started batch embedding job.
 */
export interface BatchEmbeddingResponse {
  jobArn?: string;
}