#!/usr/bin/env tsx

/**
 * Migration Progress Diagnostic Tool
 * 
 * Compares legacy database record counts with current Supabase database
 * to determine migration completion status and next steps.
 */

import { createClient } from './$node_modules/@supabase/supabase-js/dist/module/index.js';
import { Client } from './$node_modules/@types/pg/index.d.mts';

// Legacy Database Configuration
const legacyDbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'brius_legacy',
  user: 'postgres',
  password: process.env.LEGACY_DB_PASSWORD || 'postgres'
};

// Supabase Configuration
const supabaseUrl = 'https://supabase.brius.com';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoiYnJpdXMiLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.7c2CsGc9j4oSSgxshmdreykpW2HyKu36UUE38u1HdRk';

interface LegacyRecordCounts {
  practices: number;
  profiles: number;
  patients: number;
  practiceMembers: number;
  projects: number;
  states: number;
  templates: number;
}

interface SupabaseRecordCounts {
  practices: number;
  profiles: number;
  patients: number;
  cases: number;
  projects: number;
  practiceMembers: number;
  orders: number;
}

interface MigrationProgress {
  entity: string;
  legacy: number;
  current: number;
  remaining: number;
  percentage: number;
  status: 'complete' | 'partial' | 'not_started';
}

async function getLegacyRecordCounts(): Promise<LegacyRecordCounts> {
  const client = new Client(legacyDbConfig);
  
  try {
    await client.connect();
    console.log('🔍 Querying legacy database...');
    
    const queries = [
      { name: 'practices', query: 'SELECT COUNT(*) as count FROM dispatch_office' },
      { name: 'profiles', query: 'SELECT COUNT(*) as count FROM auth_user' },
      { name: 'patients', query: 'SELECT COUNT(*) as count FROM dispatch_patient' },
      { name: 'practiceMembers', query: 'SELECT COUNT(*) as count FROM dispatch_office_doctors' },
      { name: 'projects', query: 'SELECT COUNT(*) as count FROM dispatch_project' },
      { name: 'states', query: 'SELECT COUNT(*) as count FROM dispatch_state' },
      { name: 'templates', query: 'SELECT COUNT(*) as count FROM dispatch_template' }
    ];
    
    const results: LegacyRecordCounts = {} as LegacyRecordCounts;
    
    for (const { name, query } of queries) {
      try {
        const result = await client.query(query);
        results[name as keyof LegacyRecordCounts] = parseInt(result.rows[0].count);
        console.log(`   ${name}: ${result.rows[0].count}`);
      } catch (error) {
        console.error(`   ❌ Error querying ${name}:`, error.message);
        results[name as keyof LegacyRecordCounts] = 0;
      }
    }
    
    return results;
  } finally {
    await client.end();
  }
}

async function getSupabaseRecordCounts(): Promise<SupabaseRecordCounts> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('🔍 Querying Supabase database...');
  
  const entities = [
    'practices',
    'profiles', 
    'patients',
    'cases',
    'projects',
    'practice_members',
    'orders'
  ];
  
  const results: SupabaseRecordCounts = {} as SupabaseRecordCounts;
  
  for (const entity of entities) {
    try {
      const { count, error } = await supabase
        .from(entity)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.error(`   ❌ Error querying ${entity}:`, error.message);
        results[entity.replace('_', '') as keyof SupabaseRecordCounts] = 0;
      } else {
        const key = entity.replace('_', '') as keyof SupabaseRecordCounts;
        results[key] = count || 0;
        console.log(`   ${entity}: ${count || 0}`);
      }
    } catch (error) {
      console.error(`   ❌ Error querying ${entity}:`, error.message);
      results[entity.replace('_', '') as keyof SupabaseRecordCounts] = 0;
    }
  }
  
  return results;
}

function calculateProgress(legacy: LegacyRecordCounts, current: SupabaseRecordCounts): MigrationProgress[] {
  const progress: MigrationProgress[] = [
    {
      entity: 'Practices',
      legacy: legacy.practices,
      current: current.practices,
      remaining: legacy.practices - current.practices,
      percentage: legacy.practices > 0 ? (current.practices / legacy.practices) * 100 : 0,
      status: current.practices === 0 ? 'not_started' : 
              current.practices === legacy.practices ? 'complete' : 'partial'
    },
    {
      entity: 'Profiles',
      legacy: legacy.profiles,
      current: current.profiles,
      remaining: legacy.profiles - current.profiles,
      percentage: legacy.profiles > 0 ? (current.profiles / legacy.profiles) * 100 : 0,
      status: current.profiles === 0 ? 'not_started' : 
              current.profiles === legacy.profiles ? 'complete' : 'partial'
    },
    {
      entity: 'Patients',
      legacy: legacy.patients,
      current: current.patients,
      remaining: legacy.patients - current.patients,
      percentage: legacy.patients > 0 ? (current.patients / legacy.patients) * 100 : 0,
      status: current.patients === 0 ? 'not_started' : 
              current.patients === legacy.patients ? 'complete' : 'partial'
    },
    {
      entity: 'Projects',
      legacy: legacy.projects,
      current: current.projects,
      remaining: legacy.projects - current.projects,
      percentage: legacy.projects > 0 ? (current.projects / legacy.projects) * 100 : 0,
      status: current.projects === 0 ? 'not_started' : 
              current.projects === legacy.projects ? 'complete' : 'partial'
    }
  ];
  
  return progress;
}

function generateReport(progress: MigrationProgress[], legacy: LegacyRecordCounts, current: SupabaseRecordCounts): void {
  console.log('\n📊 MIGRATION PROGRESS REPORT');
  console.log('=' .repeat(80));
  
  console.log('\n📈 Entity Migration Status:');
  console.log('-'.repeat(80));
  console.log('Entity'.padEnd(15) + 'Legacy'.padEnd(10) + 'Current'.padEnd(10) + 'Remaining'.padEnd(12) + 'Progress'.padEnd(12) + 'Status');
  console.log('-'.repeat(80));
  
  for (const item of progress) {
    const statusIcon = item.status === 'complete' ? '✅' : 
                      item.status === 'partial' ? '🟡' : '❌';
    
    console.log(
      item.entity.padEnd(15) +
      item.legacy.toString().padEnd(10) +
      item.current.toString().padEnd(10) +
      item.remaining.toString().padEnd(12) +
      `${item.percentage.toFixed(1)}%`.padEnd(12) +
      `${statusIcon} ${item.status}`
    );
  }
  
  console.log('\n🔍 Additional Legacy Entities (Not Yet Mapped):');
  console.log('-'.repeat(50));
  console.log(`States (workflow tracking): ${legacy.states}`);
  console.log(`Templates (workflow automation): ${legacy.templates}`);
  console.log(`Practice Members: ${legacy.practiceMembers}`);
  
  console.log('\n📋 Next Steps Recommendation:');
  console.log('-'.repeat(50));
  
  const incomplete = progress.filter(p => p.status !== 'complete');
  if (incomplete.length === 0) {
    console.log('✅ All core entities are fully migrated!');
    console.log('   Consider migrating workflow states and templates next.');
  } else {
    console.log('🎯 Priority Migration Order:');
    incomplete
      .sort((a, b) => b.percentage - a.percentage)
      .forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.entity}: ${item.remaining} remaining (${item.percentage.toFixed(1)}% complete)`);
      });
  }
  
  console.log('\n🚀 Recommended Migration Command:');
  const skipFlags = progress
    .filter(p => p.status === 'complete')
    .map(p => `--skip-${p.entity.toLowerCase()}`)
    .join(' ');
    
  if (skipFlags) {
    console.log(`yarn run migrate:full ${skipFlags} --skip-ai-embeddings --skip-dify-population`);
  } else {
    console.log('yarn run migrate:full --skip-ai-embeddings --skip-dify-population');
  }
}

async function main(): Promise<void> {
  try {
    console.log('🔍 MIGRATION PROGRESS DIAGNOSTIC');
    console.log('=' .repeat(50));
    
    console.log('\n📊 Legacy Database Record Counts:');
    const legacyCounts = await getLegacyRecordCounts();
    
    console.log('\n📊 Current Supabase Database Record Counts:');
    const supabaseCounts = await getSupabaseRecordCounts();
    
    const progress = calculateProgress(legacyCounts, supabaseCounts);
    generateReport(progress, legacyCounts, supabaseCounts);
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}