#!/usr/bin/env tsx

/**
 * @file Test script for Dify API connection and functionality
 * @description Simple test script to validate the updated Dify service implementation
 * without running the full migration process.
 */

import { config as dotenvConfig } from './$node_modules/dotenv/lib/main.js';
import { resolve } from 'path';
import { config } from './src/utils/config.js';
import { logger } from './src/utils/logger.js';
import { difyService } from './src/services/integration/dify-service.js';

// Load environment variables from migration_tool/.env
dotenvConfig({ path: resolve(process.cwd(), '.env') });

/**
 * Test configuration and environment setup
 */
async function testConfiguration(): Promise<boolean> {
  console.log('\n🔧 Testing Dify Configuration...');
  
  try {
    // Check required environment variables
    const requiredVars = [
      'DIFY_BASE_URL',
      'DIFY_KNOWLEDGE_API_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      return false;
    }
    
    console.log('✅ Configuration check passed');
    console.log(`   Base URL: ${config.dify.baseUrl}`);
    console.log(`   API Key: ${config.dify.apiKey ? '***' + config.dify.apiKey.slice(-4) : 'NOT SET'}`);
    console.log(`   Enabled: ${config.dify.enabled}`);
    
    return true;
  } catch (error) {
    console.error('❌ Configuration test failed:', error);
    return false;
  }
}

/**
 * Test Dify service health check
 */
async function testHealthCheck(): Promise<boolean> {
  console.log('\n🏥 Testing Dify Health Check...');
  
  try {
    const healthStatus = await difyService.checkHealth();
    
    if (healthStatus.isHealthy) {
      console.log('✅ Health check passed');
      console.log(`   Response time: ${healthStatus.responseTime}ms`);
      console.log(`   Last checked: ${healthStatus.lastChecked}`);
    } else {
      console.error('❌ Health check failed');
      console.error(`   Error: ${healthStatus.error}`);
      console.error(`   Response time: ${healthStatus.responseTime}ms`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Health check test failed:', error);
    return false;
  }
}

/**
 * Test listing existing datasets
 */
async function testListDatasets(): Promise<boolean> {
  console.log('\n📋 Testing Dataset Listing...');
  
  try {
    const datasets = await difyService.listDatasets();
    
    console.log('✅ Dataset listing successful');
    console.log(`   Found ${datasets.length} datasets`);
    
    if (datasets.length > 0) {
      console.log('   Existing datasets:');
      datasets.forEach((dataset, index) => {
        console.log(`     ${index + 1}. ${dataset.name} (ID: ${dataset.id})`);
        console.log(`        Documents: ${dataset.document_count}, Words: ${dataset.word_count}`);
        console.log(`        Technique: ${dataset.indexing_technique}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Dataset listing failed:', error);
    return false;
  }
}

/**
 * Test creating a test dataset
 */
async function testCreateDataset(): Promise<string | null> {
  console.log('\n🆕 Testing Dataset Creation...');
  
  const testDatasetName = `test_dataset_${Date.now()}`;
  
  try {
    const dataset = await difyService.createDataset(
      testDatasetName,
      'Test dataset created by validation script'
    );
    
    console.log('✅ Dataset creation successful');
    console.log(`   Dataset ID: ${dataset.id}`);
    console.log(`   Dataset Name: ${dataset.name}`);
    console.log(`   Embedding Model: ${dataset.embedding_model}`);
    console.log(`   Embedding Provider: ${dataset.embedding_model_provider}`);
    
    return dataset.id;
  } catch (error) {
    console.error('❌ Dataset creation failed:', error);
    console.error('   This might indicate API structure issues or authentication problems');
    return null;
  }
}

/**
 * Test adding a document to the test dataset
 */
async function testAddDocument(datasetId: string): Promise<boolean> {
  console.log('\n📄 Testing Document Addition...');
  
  const testDocumentName = `test_document_${Date.now()}`;
  const testContent = `This is a test document created at ${new Date().toISOString()}. 
It contains sample content to test the Dify knowledge base functionality.
The document includes multiple sentences to test text processing and segmentation.`;
  
  try {
    const document = await difyService.addDocumentByText(
      datasetId,
      testDocumentName,
      testContent
    );
    
    console.log('✅ Document addition successful');
    console.log(`   Document ID: ${document.id}`);
    console.log(`   Document Name: ${document.name}`);
    console.log(`   Indexing Status: ${document.indexing_status}`);
    console.log(`   Word Count: ${document.word_count}`);
    
    return true;
  } catch (error) {
    console.error('❌ Document addition failed:', error);
    return false;
  }
}

/**
 * Test searching the dataset
 */
async function testSearch(datasetId: string): Promise<boolean> {
  console.log('\n🔍 Testing Dataset Search...');
  
  try {
    const searchResults = await difyService.searchDataset(
      datasetId,
      'test document sample content'
    );
    
    console.log('✅ Search successful');
    console.log(`   Found ${searchResults?.length || 0} results`);
    
    if (searchResults && searchResults.length > 0) {
      console.log('   Search results:');
      searchResults.forEach((result, index) => {
        console.log(`     ${index + 1}. Score: ${result.score}`);
        console.log(`        Content: ${result.content.substring(0, 100)}...`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Search failed:', error);
    return false;
  }
}

/**
 * Clean up test dataset
 */
async function cleanupTestDataset(datasetId: string): Promise<void> {
  console.log('\n🧹 Cleaning up test dataset...');
  
  try {
    await difyService.deleteDataset(datasetId);
    console.log('✅ Test dataset cleaned up successfully');
  } catch (error) {
    console.error('❌ Failed to clean up test dataset:', error);
    console.error(`   Please manually delete dataset ID: ${datasetId}`);
  }
}

/**
 * Main test execution
 */
async function runTests(): Promise<void> {
  console.log('🚀 Starting Dify API Connection Tests\n');
  console.log('=' .repeat(50));
  
  let testDatasetId: string | null = null;
  let allTestsPassed = true;
  
  try {
    // Test 1: Configuration
    const configOk = await testConfiguration();
    if (!configOk) {
      allTestsPassed = false;
      console.log('\n❌ Configuration test failed - stopping here');
      return;
    }
    
    // Test 2: Health Check
    const healthOk = await testHealthCheck();
    if (!healthOk) {
      allTestsPassed = false;
      console.log('\n❌ Health check failed - stopping here');
      return;
    }
    
    // Test 3: List Datasets
    const listOk = await testListDatasets();
    if (!listOk) {
      allTestsPassed = false;
    }
    
    // Test 4: Create Dataset
    testDatasetId = await testCreateDataset();
    if (!testDatasetId) {
      allTestsPassed = false;
      console.log('\n❌ Dataset creation failed - skipping remaining tests');
    } else {
      // Test 5: Add Document
      const docOk = await testAddDocument(testDatasetId);
      if (!docOk) {
        allTestsPassed = false;
      }
      
      // Wait a moment for indexing
      console.log('\n⏳ Waiting 5 seconds for document indexing...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test 6: Search
      const searchOk = await testSearch(testDatasetId);
      if (!searchOk) {
        allTestsPassed = false;
      }
    }
    
  } catch (error) {
    console.error('\n💥 Unexpected error during testing:', error);
    allTestsPassed = false;
  } finally {
    // Cleanup
    if (testDatasetId) {
      await cleanupTestDataset(testDatasetId);
    }
    
    // Final results
    console.log('\n' + '=' .repeat(50));
    if (allTestsPassed) {
      console.log('🎉 All tests passed! Dify integration is working correctly.');
      console.log('\nThe updated implementation should resolve the previous errors.');
    } else {
      console.log('❌ Some tests failed. Check the error messages above for details.');
      console.log('\nCommon issues to check:');
      console.log('  - Verify DIFY_BASE_URL includes /v1 (e.g., https://dify.brius.com/v1)');
      console.log('  - Ensure DIFY_KNOWLEDGE_API_KEY is correct and has proper permissions');
      console.log('  - Check that Bedrock models are enabled in your AWS account');
      console.log('  - Verify network connectivity to your Dify instance');
    }
    
    process.exit(allTestsPassed ? 0 : 1);
  }
}

// Run the tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { runTests };