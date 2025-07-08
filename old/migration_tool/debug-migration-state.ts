#!/usr/bin/env tsx

/**
 * Migration State Debugging Tool
 * 
 * Validates specific assumptions about migration interruption causes:
 * 1. AI Embeddings service initialization despite skip flags
 * 2. Incremental loading logic for partial migration resume
 * 3. Current Supabase database state
 */

import { createClient } from './$node_modules/@supabase/supabase-js/dist/module/index.js';

// Supabase Configuration
const supabaseUrl = 'https://supabase.brius.com';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoiYnJpdXMiLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.7c2CsGc9j4oSSgxshmdreykpW2HyKu36UUE38u1HdRk';

interface DatabaseState {
  practices: number;
  profiles: number;
  patients: number;
  cases: number;
  projects: number;
  practiceMembers: number;
  orders: number;
}

interface ValidationResult {
  assumption: string;
  status: 'confirmed' | 'rejected' | 'inconclusive';
  evidence: string[];
  recommendation: string;
}

async function getCurrentDatabaseState(): Promise<DatabaseState> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('🔍 Checking current Supabase database state...');
  
  const entities = [
    'practices',
    'profiles', 
    'patients',
    'cases',
    'projects',
    'practice_members',
    'orders'
  ];
  
  const results: DatabaseState = {} as DatabaseState;
  
  for (const entity of entities) {
    try {
      const { count, error } = await supabase
        .from(entity)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`   ❌ ${entity}: Error - ${error.message}`);
        results[entity.replace('_', '') as keyof DatabaseState] = 0;
      } else {
        const key = entity.replace('_', '') as keyof DatabaseState;
        results[key] = count || 0;
        console.log(`   ✅ ${entity}: ${count || 0} records`);
      }
    } catch (error) {
      console.log(`   ❌ ${entity}: Exception - ${error.message}`);
      results[entity.replace('_', '') as keyof DatabaseState] = 0;
    }
  }
  
  return results;
}

async function validateAssumptions(dbState: DatabaseState): Promise<ValidationResult[]> {
  const validations: ValidationResult[] = [];
  
  // Assumption 1: Partial Profile Migration (5,502 out of 9,101)
  const profileAssumption: ValidationResult = {
    assumption: 'Partial Profile Migration - 5,502 out of 9,101 profiles migrated',
    status: 'inconclusive',
    evidence: [],
    recommendation: ''
  };
  
  if (dbState.profiles === 5502) {
    profileAssumption.status = 'confirmed';
    profileAssumption.evidence.push(`Exactly 5,502 profiles found in database`);
    profileAssumption.recommendation = 'Resume migration with --skip-profiles flag to avoid duplicates';
  } else if (dbState.profiles > 5000 && dbState.profiles < 9101) {
    profileAssumption.status = 'confirmed';
    profileAssumption.evidence.push(`${dbState.profiles} profiles found - partial migration confirmed`);
    profileAssumption.recommendation = 'Resume migration with incremental loading logic';
  } else if (dbState.profiles === 0) {
    profileAssumption.status = 'rejected';
    profileAssumption.evidence.push('No profiles found - migration may need to start fresh');
    profileAssumption.recommendation = 'Run full migration without skip flags';
  } else {
    profileAssumption.evidence.push(`${dbState.profiles} profiles found - unexpected count`);
    profileAssumption.recommendation = 'Investigate profile migration logic';
  }
  
  validations.push(profileAssumption);
  
  // Assumption 2: Missing Project-Centric Entities
  const projectAssumption: ValidationResult = {
    assumption: 'Project-centric entities (cases, projects) are missing or incomplete',
    status: 'inconclusive',
    evidence: [],
    recommendation: ''
  };
  
  if (dbState.cases === 0 && dbState.projects === 0) {
    projectAssumption.status = 'confirmed';
    projectAssumption.evidence.push('No cases or projects found');
    projectAssumption.evidence.push('Project-centric migration logic may not be implemented');
    projectAssumption.recommendation = 'Implement dispatch_project extraction and case/project creation logic';
  } else if (dbState.cases > 0 || dbState.projects > 0) {
    projectAssumption.status = 'rejected';
    projectAssumption.evidence.push(`${dbState.cases} cases and ${dbState.projects} projects found`);
    projectAssumption.recommendation = 'Project-centric logic appears to be working';
  }
  
  validations.push(projectAssumption);
  
  // Assumption 3: Practice Migration Status
  const practiceAssumption: ValidationResult = {
    assumption: 'Practices migration is incomplete (expected 844 from legacy)',
    status: 'inconclusive',
    evidence: [],
    recommendation: ''
  };
  
  if (dbState.practices === 0) {
    practiceAssumption.status = 'confirmed';
    practiceAssumption.evidence.push('No practices found - migration not started');
    practiceAssumption.recommendation = 'Start with practice migration first (dependency requirement)';
  } else if (dbState.practices === 844) {
    practiceAssumption.status = 'rejected';
    practiceAssumption.evidence.push('All 844 practices migrated successfully');
    practiceAssumption.recommendation = 'Use --skip-practices flag for remaining migration';
  } else {
    practiceAssumption.evidence.push(`${dbState.practices} practices found (expected 844)`);
    practiceAssumption.recommendation = 'Verify practice migration completeness';
  }
  
  validations.push(practiceAssumption);
  
  // Assumption 4: Patient Migration Status
  const patientAssumption: ValidationResult = {
    assumption: 'Patient migration is incomplete (expected 7,849 from legacy)',
    status: 'inconclusive',
    evidence: [],
    recommendation: ''
  };
  
  if (dbState.patients === 0) {
    patientAssumption.status = 'confirmed';
    patientAssumption.evidence.push('No patients found - migration not started');
    patientAssumption.recommendation = 'Migrate patients after practices and profiles';
  } else if (dbState.patients === 7849) {
    patientAssumption.status = 'rejected';
    patientAssumption.evidence.push('All 7,849 patients migrated successfully');
    patientAssumption.recommendation = 'Use --skip-patients flag for remaining migration';
  } else {
    patientAssumption.evidence.push(`${dbState.patients} patients found (expected 7,849)`);
    patientAssumption.recommendation = 'Resume patient migration with incremental loading';
  }
  
  validations.push(patientAssumption);
  
  return validations;
}

function generateDiagnosticReport(dbState: DatabaseState, validations: ValidationResult[]): void {
  console.log('\n🔍 MIGRATION STATE DIAGNOSTIC REPORT');
  console.log('=' .repeat(80));
  
  console.log('\n📊 Current Database State:');
  console.log('-'.repeat(50));
  console.log(`Practices: ${dbState.practices} (expected: 844)`);
  console.log(`Profiles: ${dbState.profiles} (expected: 9,101)`);
  console.log(`Patients: ${dbState.patients} (expected: 7,849)`);
  console.log(`Cases: ${dbState.cases} (new entity)`);
  console.log(`Projects: ${dbState.projects} (new entity)`);
  console.log(`Practice Members: ${dbState.practiceMembers} (expected: 438)`);
  console.log(`Orders: ${dbState.orders} (expected: 0 - empty in legacy)`);
  
  console.log('\n🔬 Assumption Validation Results:');
  console.log('-'.repeat(80));
  
  validations.forEach((validation, index) => {
    const statusIcon = validation.status === 'confirmed' ? '✅' : 
                      validation.status === 'rejected' ? '❌' : '🟡';
    
    console.log(`\n${index + 1}. ${statusIcon} ${validation.assumption}`);
    console.log(`   Status: ${validation.status.toUpperCase()}`);
    
    if (validation.evidence.length > 0) {
      console.log('   Evidence:');
      validation.evidence.forEach(evidence => {
        console.log(`     • ${evidence}`);
      });
    }
    
    if (validation.recommendation) {
      console.log(`   Recommendation: ${validation.recommendation}`);
    }
  });
  
  console.log('\n🎯 NEXT STEPS BASED ON DIAGNOSIS:');
  console.log('-'.repeat(50));
  
  const confirmedIssues = validations.filter(v => v.status === 'confirmed');
  if (confirmedIssues.length > 0) {
    console.log('Priority Issues to Address:');
    confirmedIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.recommendation}`);
    });
  } else {
    console.log('✅ No critical issues confirmed. Migration appears to be progressing normally.');
  }
  
  console.log('\n🚀 Recommended Migration Command:');
  console.log('-'.repeat(50));
  
  // Generate skip flags based on completed entities
  const skipFlags: string[] = [];
  
  if (dbState.practices === 844) skipFlags.push('--skip-practices');
  if (dbState.profiles >= 5000) skipFlags.push('--skip-profiles');
  if (dbState.patients === 7849) skipFlags.push('--skip-patients');
  
  // Always skip AI embeddings and Dify for now
  skipFlags.push('--skip-ai-embeddings', '--skip-dify-population');
  
  const command = `yarn run migrate:full ${skipFlags.join(' ')}`;
  console.log(command);
  
  console.log('\n⚠️  IMPORTANT NOTES:');
  console.log('-'.repeat(30));
  console.log('• Run the diagnostic script first to confirm current state');
  console.log('• Use incremental loading to avoid duplicates');
  console.log('• Monitor for AI embeddings service initialization');
  console.log('• Ensure proper foreign key dependency order');
}

async function main(): Promise<void> {
  try {
    console.log('🔍 MIGRATION STATE DEBUGGING');
    console.log('=' .repeat(50));
    
    const dbState = await getCurrentDatabaseState();
    const validations = await validateAssumptions(dbState);
    generateDiagnosticReport(dbState, validations);
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}