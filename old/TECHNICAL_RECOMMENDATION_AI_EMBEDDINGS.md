# Technical Recommendation: AI Embeddings with Amazon Bedrock

This document outlines the technical recommendations for implementing AI-powered semantic search and retrieval capabilities using vector embeddings with Amazon Bedrock. The focus is on creating a secure, scalable, and cost-effective solution for the new Supabase data model, specifically for orthodontic case data.

## 1. Executive Summary

We recommend using **Amazon Titan Text Embeddings v2** as the primary model for generating embeddings, deployed within a **HIPAA-compliant architecture** using AWS PrivateLink. Data will be processed using a **fixed-size chunking strategy** and ingested efficiently via **batch inference jobs**. This approach will provide a robust foundation for advanced AI features while ensuring data privacy and optimizing costs.

## 2. Embedding Model Selection

Based on extensive research, we recommend the following embedding model:

*   **Primary Recommendation:** **Amazon Titan Text Embeddings v2 (`amazon.titan-embed-text-v2:0`)**
    *   **Rationale:** This model offers a compelling combination of performance, cost-effectiveness, and features tailored for our use case.
    *   **Key Features:**
        *   **Flexible Output Dimensions:** Supports 256, 512, and 1024 dimensions, allowing for a balance between performance and cost. We will start with **1024 dimensions** to align with the schema but can adjust as needed.
        *   **Cost-Effective:** At **$0.02 per 1 million tokens**, it is significantly cheaper than both its predecessor and OpenAI's models.
        *   **Unit Vector Normalization:** Built-in support for normalization simplifies similarity calculations.
        *   **Large Context Window:** Can handle up to 8,192 tokens, making it suitable for detailed medical documents.
        *   **Batch Processing Support:** Optimized for throughput-focused batch jobs, which is ideal for our initial data migration and ongoing data ingestion.

*   **Secondary Alternative:** **Cohere Embed v3 (`cohere.embed-english-v3`)**
    *   **Rationale:** A strong alternative, particularly if extensive multilingual support becomes a priority.
    *   **Key Features:**
        *   **High Performance:** Excellent for retrieval-augmented generation (RAG) use cases.
        *   **Specific Input Types:** Supports `search_document` and `search_query` input types for optimized search performance.
        *   **Multilingual:** Supports over 100 languages.

We will proceed with **Amazon Titan Text Embeddings v2** due to its superior cost-performance ratio and alignment with our architectural goals.

## 3. Architecture and Security

To ensure a secure and compliant environment for handling sensitive patient data, we will implement the following architecture:

*   **AWS PrivateLink:** All communication between our application in `us-west-2` and the Amazon Bedrock service in `us-east-1` will be routed through a **VPC endpoint**. This avoids exposing data to the public internet and is a cornerstone of a HIPAA-compliant setup.
*   **IAM Roles:** We will create a dedicated IAM service role with least-privilege permissions for the migration tool to access Amazon Bedrock and the S3 buckets required for batch inference.

## 4. Data Handling and Processing

### 4.1. Chunking Strategy

For processing medical documents (case summaries, treatment plans, notes, etc.), we will adopt the following chunking strategy:

*   **Method:** **Fixed-Size Chunking with Overlap**
*   **Chunk Size:** **512 tokens**. This size provides a good balance, capturing sufficient semantic context without being overly broad.
*   **Overlap:** **20% overlap** (approximately 100 tokens). This helps maintain context between chunks and ensures that concepts that span chunk boundaries are not lost.
*   **Implementation:** This can be implemented within the data transformation layer of our migration tool before the data is sent for embedding.

### 4.2. Batch Processing

For the initial bulk embedding of existing data and for handling large new data imports, we will use Amazon Bedrock's **batch inference** capabilities.

*   **Process:**
    1.  Prepare the source data (chunked text) in a JSONL file and upload it to a designated S3 bucket.
    2.  Initiate a `CreateModelInvocationJob` via the AWS SDK.
    3.  Specify the input S3 location, the output S3 location, and the IAM role.
    4.  Amazon Bedrock will process the files in a throughput-optimized manner and place the resulting embeddings in the output S3 bucket.
    5.  A separate process will then load these embeddings into the Supabase database.

## 5. TypeScript Implementation Outline

The implementation will utilize the `@aws-sdk/client-bedrock-runtime` and `@aws-sdk/client-bedrock` packages.

### 5.1. Real-time Embedding (for smaller, single-document updates)

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "us-east-1" });
const modelId = "amazon.titan-embed-text-v2:0";

async function generateEmbedding(text: string): Promise<number[]> {
  const payload = {
    inputText: text,
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  try {
    const response = await client.send(command);
    const decodedResponseBody = new TextDecoder().decode(response.body);
    const responseBody = JSON.parse(decodedResponseBody);
    return responseBody.embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}
```

### 5.2. Batch Inference Job Creation (High-Level)

```typescript
import { BedrockClient, CreateModelInvocationJobCommand } from "@aws-sdk/client-bedrock";

const client = new BedrockClient({ region: "us-east-1" });

async function startBatchEmbeddingJob(inputS3Uri: string, outputS3Uri: string, roleArn: string) {
    const command = new CreateModelInvocationJobCommand({
        jobName: `embedding-job-${Date.now()}`,
        modelId: "amazon.titan-embed-text-v2:0",
        roleArn: roleArn,
        inputDataConfig: {
            s3Config: {
                s3Uri: inputS3Uri,
            },
        },
        outputDataConfig: {
            s3Config: {
                s3Uri: outputS3Uri,
            },
        },
    });

    try {
        const response = await client.send(command);
        console.log("Batch job started:", response.jobArn);
        return response.jobArn;
    } catch (error) {
        console.error("Error starting batch job:", error);
        throw error;
    }
}
```

## 6. Next Steps

1.  **Develop Data Preparation Script:** Create a script to implement the defined chunking strategy on the source data.
2.  **IAM Role Configuration:** Configure the necessary IAM roles and policies for Bedrock and S3 access.
3.  **VPC Endpoint Setup:** Provision the VPC endpoint for Amazon Bedrock in the `us-west-2` region.
4.  **Implement Embedding Logic:** Integrate the `generateEmbedding` and `startBatchEmbeddingJob` functions into the migration tool.
5.  **Testing:** Perform tests with a subset of data to validate the entire workflow, from chunking to embedding storage.