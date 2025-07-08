import { createClient } from './$node_modules/@supabase/supabase-js/dist/module/index.js';
import dotenv from './$node_modules/dotenv/lib/main.js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface DiagnosticResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  data?: Record<string, unknown>;
}

class ComprehensiveDiagnostic {
  private results: DiagnosticResult[] = [];

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'WARNING', details: string, data?: Record<string, unknown>) {
    this.results.push({ test, status, details, data });
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${test}: ${details}`);
    if (data && Object.keys(data).length > 0) {
      console.log(`   Data:`, JSON.stringify(data, null, 2));
    }
  }

  async checkDatabaseConnection() {
    try {
      const { data, error } = await supabase.from('auth_user').select('count').limit(1);
      if (error) {
        this.addResult('Database Connection', 'FAIL', `Connection failed: ${error.message}`);
      } else {
        this.addResult('Database Connection', 'PASS', 'Successfully connected to database');
      }
    } catch (error) {
      this.addResult('Database Connection', 'FAIL', `Connection error: ${error}`);
    }
  }

  async checkLegacyTables() {
    const legacyTables = [
      'dispatch_office', 'dispatch_patient', 'dispatch_order', 
      'dispatch_client', 'auth_user'
    ];

    for (const table of legacyTables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          this.addResult(`Legacy Table: ${table}`, 'FAIL', `Table access failed: ${error.message}`);
        } else {
          this.addResult(`Legacy Table: ${table}`, 'PASS', `Table exists and accessible, sample count: ${data?.length || 0}`);
        }
      } catch (error) {
        this.addResult(`Legacy Table: ${table}`, 'FAIL', `Table check error: ${error}`);
      }
    }
  }

  async checkTargetTables() {
    const targetTables = ['profiles', 'patients', 'practices', 'cases', 'orders'];

    for (const table of targetTables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          this.addResult(`Target Table: ${table}`, 'FAIL', `Table missing or inaccessible: ${error.message}`);
        } else {
          this.addResult(`Target Table: ${table}`, 'PASS', `Table exists and accessible`);
        }
      } catch (error) {
        this.addResult(`Target Table: ${table}`, 'FAIL', `Table check error: ${error}`);
      }
    }
  }

  async checkDataCounts() {
    const tables = [
      'dispatch_office', 'dispatch_patient', 'dispatch_order', 
      'dispatch_client', 'auth_user'
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          this.addResult(`Data Count: ${table}`, 'WARNING', `Count failed: ${error.message}`);
        } else {
          this.addResult(`Data Count: ${table}`, 'PASS', `Records available: ${count || 0}`);
        }
      } catch (error) {
        this.addResult(`Data Count: ${table}`, 'WARNING', `Count error: ${error}`);
      }
    }
  }

  async testSampleInsert() {
    try {
      // Try to insert into profiles table (should fail if table doesn't exist)
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: 'test-diagnostic-id',
          email: 'test@diagnostic.com',
          is_active: true
        })
        .select();

      if (error) {
        this.addResult('Sample Insert Test', 'FAIL', `Insert failed as expected: ${error.message}`, { error_code: error.code });
      } else {
        // Clean up test record if insert succeeded
        await supabase.from('profiles').delete().eq('id', 'test-diagnostic-id');
        this.addResult('Sample Insert Test', 'PASS', 'Insert succeeded - target schema exists');
      }
    } catch (error) {
      this.addResult('Sample Insert Test', 'FAIL', `Insert test error: ${error}`);
    }
  }

  async checkEnvironmentConfig() {
    const requiredEnvVars = [
      'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'NODE_ENV', 'DEV_SKIP_DB'
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (!value) {
        this.addResult(`Environment: ${envVar}`, 'FAIL', 'Missing required environment variable');
      } else {
        this.addResult(`Environment: ${envVar}`, 'PASS', `Set to: ${envVar.includes('KEY') ? '[REDACTED]' : value}`);
      }
    }
  }

  async checkSupabaseRPC() {
    try {
      // Test if we can execute SQL via RPC (needed for schema creation)
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: 'SELECT 1 as test_value;' 
      });

      if (error) {
        this.addResult('Supabase RPC', 'FAIL', `RPC not available: ${error.message}`);
      } else {
        this.addResult('Supabase RPC', 'PASS', 'RPC function available for schema operations');
      }
    } catch (error) {
      this.addResult('Supabase RPC', 'FAIL', `RPC test error: ${error}`);
    }
  }

  generateSummaryReport() {
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE DIAGNOSTIC SUMMARY');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;

    console.log(`\nResults: ${passed} PASSED, ${failed} FAILED, ${warnings} WARNINGS`);

    console.log('\n📋 DIAGNOSIS:');
    
    const targetTableFailures = this.results.filter(r => 
      r.test.startsWith('Target Table:') && r.status === 'FAIL'
    );

    const legacyTablePasses = this.results.filter(r => 
      r.test.startsWith('Legacy Table:') && r.status === 'PASS'
    );

    if (targetTableFailures.length > 0 && legacyTablePasses.length > 0) {
      console.log('✅ ROOT CAUSE CONFIRMED: Missing Target Schema');
      console.log('   - Legacy Django tables exist and are accessible');
      console.log('   - Target tables (profiles, patients, practices, etc.) do not exist');
      console.log('   - Migration tool is trying to insert into non-existent tables');
      
      console.log('\n🔧 RECOMMENDED SOLUTION:');
      console.log('   1. Create target schema using setup-schema.ts');
      console.log('   2. Run: cd migration_tool && yarn tsx setup-schema.ts');
      console.log('   3. Verify target tables are created');
      console.log('   4. Re-run migration with: yarn migrate:full');
    } else if (targetTableFailures.length === 0) {
      console.log('⚠️  UNEXPECTED: Target tables appear to exist');
      console.log('   - Need to investigate column structure mismatch');
      console.log('   - Check for missing columns like is_active, address, etc.');
    } else {
      console.log('❌ COMPLEX ISSUE: Multiple problems detected');
      console.log('   - Review individual test results above');
      console.log('   - May need database connection or permission fixes');
    }

    console.log('\n📊 DETAILED RESULTS:');
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${result.test}: ${result.details}`);
    });
  }

  async runFullDiagnostic() {
    console.log('🔍 Starting Comprehensive Migration Diagnostic...\n');

    await this.checkEnvironmentConfig();
    await this.checkDatabaseConnection();
    await this.checkLegacyTables();
    await this.checkTargetTables();
    await this.checkDataCounts();
    await this.testSampleInsert();
    await this.checkSupabaseRPC();

    this.generateSummaryReport();
  }
}

// Run diagnostic
const diagnostic = new ComprehensiveDiagnostic();
diagnostic.runFullDiagnostic().catch(console.error);