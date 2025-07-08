/**
 * Connection Manager for Legacy Django MDW to Supabase Migration
 * Handles database connections, connection pooling, and transaction management
 */

import { Pool, PoolClient, PoolConfig } from '../../$node_modules/@types/pg/index.d.mts';
import { createClient, SupabaseClient } from '../../$node_modules/@supabase/supabase-js/dist/module/index.js';
import { 
  DatabaseConfig, 
  ConnectionPool, 
  QueryResult, 
  MigrationError 
} from '../types/legacy-migration-types.js';

export class LegacyMigrationConnectionManager {
  private legacyPool: Pool | null = null;
  private supabasePool: Pool | null = null;
  private supabaseClient: SupabaseClient | null = null;
  private isInitialized = false;
  private connectionCounts = {
    legacy: 0,
    supabase: 0
  };

  constructor(
    private legacyConfig: DatabaseConfig,
    private supabaseConfig: DatabaseConfig,
    private supabaseUrl: string,
    private supabaseServiceKey: string
  ) {}

  /**
   * Initialize database connections and connection pools
   */
  async initialize(): Promise<void> {
    try {
      // Initialize legacy PostgreSQL connection pool
      await this.initializeLegacyPool();
      
      // Initialize Supabase connection pool
      await this.initializeSupabasePool();
      
      // Initialize Supabase client for additional operations
      await this.initializeSupabaseClient();
      
      // Test connections
      await this.testConnections();
      
      this.isInitialized = true;
      console.log('✅ Connection Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Connection Manager:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Initialize legacy Django database connection pool
   */
  private async initializeLegacyPool(): Promise<void> {
    const poolConfig: PoolConfig = {
      host: this.legacyConfig.host,
      port: this.legacyConfig.port,
      database: this.legacyConfig.database,
      user: this.legacyConfig.username,
      password: this.legacyConfig.password,
      ssl: this.legacyConfig.ssl ? { rejectUnauthorized: false } : false,
      max: 10, // Maximum number of connections
      min: 2,  // Minimum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    this.legacyPool = new Pool(poolConfig);

    // Handle pool events
    this.legacyPool.on('connect', (_client) => {
      this.connectionCounts.legacy++;
      console.log(`🔗 Legacy DB connection established (${this.connectionCounts.legacy})`);
    });

    this.legacyPool.on('remove', (_client) => {
      this.connectionCounts.legacy--;
      console.log(`🔌 Legacy DB connection removed (${this.connectionCounts.legacy})`);
    });

    this.legacyPool.on('error', (err, _client) => {
      console.error('❌ Legacy DB pool error:', err);
    });
  }

  /**
   * Initialize Supabase database connection pool
   */
  private async initializeSupabasePool(): Promise<void> {
    const poolConfig: PoolConfig = {
      host: this.supabaseConfig.host,
      port: this.supabaseConfig.port,
      database: this.supabaseConfig.database,
      user: this.supabaseConfig.username,
      password: this.supabaseConfig.password,
      ssl: this.supabaseConfig.ssl !== false ? { rejectUnauthorized: false } : false,
      max: 15, // Higher limit for target database
      min: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    this.supabasePool = new Pool(poolConfig);

    // Handle pool events
    this.supabasePool.on('connect', (_client) => {
      this.connectionCounts.supabase++;
      console.log(`🔗 Supabase DB connection established (${this.connectionCounts.supabase})`);
    });

    this.supabasePool.on('remove', (_client) => {
      this.connectionCounts.supabase--;
      console.log(`🔌 Supabase DB connection removed (${this.connectionCounts.supabase})`);
    });

    this.supabasePool.on('error', (err, _client) => {
      console.error('❌ Supabase DB pool error:', err);
    });
  }

  /**
   * Initialize Supabase client for additional operations
   */
  private async initializeSupabaseClient(): Promise<void> {
    this.supabaseClient = createClient(this.supabaseUrl, this.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });
  }

  /**
   * Test database connections
   */
  private async testConnections(): Promise<void> {
    // Test legacy connection
    if (!this.legacyPool) {
      throw new Error('Legacy pool not initialized');
    }

    const legacyClient = await this.legacyPool.connect();
    try {
      const result = await legacyClient.query('SELECT NOW() as current_time, version()');
      console.log('✅ Legacy DB connection test successful:', result.rows[0]);
    } finally {
      legacyClient.release();
    }

    // Test Supabase connection
    if (!this.supabasePool) {
      throw new Error('Supabase pool not initialized');
    }

    const supabaseClient = await this.supabasePool.connect();
    try {
      const result = await supabaseClient.query('SELECT NOW() as current_time, version()');
      console.log('✅ Supabase DB connection test successful:', result.rows[0]);
    } finally {
      supabaseClient.release();
    }

    // Test Supabase client
    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    const { data: _data, error } = await this.supabaseClient
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist" which is expected
      console.warn('⚠️ Supabase client test warning:', error.message);
    } else {
      console.log('✅ Supabase client test successful');
    }
  }

  /**
   * Execute query on legacy database
   */
  async queryLegacy<T = unknown>(
    query: string, 
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.legacyPool) {
      throw new Error('Legacy pool not initialized');
    }

    const startTime = Date.now();
    const client = await this.legacyPool.connect();
    
    try {
      const result = await client.query(query, params);
      const duration = Date.now() - startTime;
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command,
        duration
      };
    } catch (error) {
      const migrationError: MigrationError = {
        id: `legacy_query_${Date.now()}`,
        phase: 'data_extraction',
        step: 'legacy_query',
        errorType: 'database',
        message: `Legacy query failed: ${(error as Error).message}`,
        details: { query, params },
        timestamp: new Date(),
        retryCount: 0
      };
      throw migrationError;
    } finally {
      client.release();
    }
  }

  /**
   * Execute query on Supabase database
   */
  async querySupabase<T = unknown>(
    query: string, 
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.supabasePool) {
      throw new Error('Supabase pool not initialized');
    }

    const startTime = Date.now();
    const client = await this.supabasePool.connect();
    
    try {
      const result = await client.query(query, params);
      const duration = Date.now() - startTime;
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command,
        duration
      };
    } catch (error) {
      const migrationError: MigrationError = {
        id: `supabase_query_${Date.now()}`,
        phase: 'data_insertion',
        step: 'supabase_query',
        errorType: 'database',
        message: `Supabase query failed: ${(error as Error).message}`,
        details: { query, params },
        timestamp: new Date(),
        retryCount: 0
      };
      throw migrationError;
    } finally {
      client.release();
    }
  }

  /**
   * Execute transaction on legacy database
   */
  async transactionLegacy<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.legacyPool) {
      throw new Error('Legacy pool not initialized');
    }

    const client = await this.legacyPool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute transaction on Supabase database
   */
  async transactionSupabase<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.supabasePool) {
      throw new Error('Supabase pool not initialized');
    }

    const client = await this.supabasePool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch insert records into Supabase
   */
  async batchInsertSupabase<T extends Record<string, unknown>>(
    tableName: string,
    records: T[],
    batchSize = 100
  ): Promise<void> {
    if (records.length === 0) return;

    const batches = this.chunkArray(records, batchSize);
    
    for (const batch of batches) {
      if (batch.length === 0) continue;
      
      const firstRecord = batch[0];
      if (!firstRecord) continue;
      
      const columns = Object.keys(firstRecord);
      const placeholders = batch.map((_, index) =>
        `(${columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`).join(', ')})`
      ).join(', ');
      
      const values = batch.flatMap(record => columns.map(col => record[col]));
      
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${placeholders}
        ON CONFLICT DO NOTHING
      `;
      
      await this.querySupabase(query, values);
    }
  }

  /**
   * Get connection pool status
   */
  getConnectionStatus(): ConnectionPool {
    return {
      legacy: this.legacyPool,
      supabase: this.supabasePool,
      isConnected: this.isInitialized,
      connectionCount: this.connectionCounts.legacy + this.connectionCounts.supabase,
      maxConnections: 25 // 10 legacy + 15 supabase
    };
  }

  /**
   * Get Supabase client for additional operations
   */
  getSupabaseClient(): SupabaseClient {
    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }
    return this.supabaseClient;
  }

  /**
   * Check if connections are healthy
   */
  async healthCheck(): Promise<{ legacy: boolean; supabase: boolean }> {
    const results = { legacy: false, supabase: false };

    try {
      await this.queryLegacy('SELECT 1');
      results.legacy = true;
    } catch (error) {
      console.error('Legacy DB health check failed:', error);
    }

    try {
      await this.querySupabase('SELECT 1');
      results.supabase = true;
    } catch (error) {
      console.error('Supabase DB health check failed:', error);
    }

    return results;
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    legacy: { tableCount: number; recordCount: number };
    supabase: { tableCount: number; recordCount: number };
  }> {
    interface StatsRow {
      table_count: string;
      record_count: string;
    }

    const legacyStats = await this.queryLegacy<StatsRow>(`
      SELECT
        COUNT(*) as table_count,
        COALESCE(SUM(n_tup_ins + n_tup_upd + n_tup_del), 0) as record_count
      FROM pg_stat_user_tables
    `);

    const supabaseStats = await this.querySupabase<StatsRow>(`
      SELECT
        COUNT(*) as table_count,
        COALESCE(SUM(n_tup_ins + n_tup_upd + n_tup_del), 0) as record_count
      FROM pg_stat_user_tables
    `);

    return {
      legacy: {
        tableCount: parseInt(legacyStats.rows[0]?.table_count || '0'),
        recordCount: parseInt(legacyStats.rows[0]?.record_count || '0')
      },
      supabase: {
        tableCount: parseInt(supabaseStats.rows[0]?.table_count || '0'),
        recordCount: parseInt(supabaseStats.rows[0]?.record_count || '0')
      }
    };
  }

  /**
   * Cleanup connections and close pools
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up database connections...');

    const cleanupPromises: Promise<void>[] = [];

    if (this.legacyPool) {
      cleanupPromises.push(
        this.legacyPool.end().catch(err => 
          console.error('Error closing legacy pool:', err)
        )
      );
    }

    if (this.supabasePool) {
      cleanupPromises.push(
        this.supabasePool.end().catch(err => 
          console.error('Error closing Supabase pool:', err)
        )
      );
    }

    await Promise.all(cleanupPromises);

    this.legacyPool = null;
    this.supabasePool = null;
    this.supabaseClient = null;
    this.isInitialized = false;
    this.connectionCounts = { legacy: 0, supabase: 0 };

    console.log('✅ Database connections cleaned up');
  }

  /**
   * Utility method to chunk arrays for batch processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get connection metrics for monitoring
   */
  getMetrics(): {
    legacyConnections: number;
    supabaseConnections: number;
    totalConnections: number;
    isHealthy: boolean;
  } {
    return {
      legacyConnections: this.connectionCounts.legacy,
      supabaseConnections: this.connectionCounts.supabase,
      totalConnections: this.connectionCounts.legacy + this.connectionCounts.supabase,
      isHealthy: this.isInitialized
    };
  }
}