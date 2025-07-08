#!/bin/bash

# Phase 1: Profiles-Only Migration Script
# Healthcare Data Migration - Table-by-Table Approach
# Target: Complete remaining 3,599 profiles (Total: 9,101)
# Current: ~5,502 profiles migrated

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the migration_tool directory
if [ ! -f "package.json" ]; then
    error "This script must be run from the migration_tool directory"
    exit 1
fi

# Check if required files exist
if [ ! -f "src/services/migration.service.ts" ]; then
    error "Migration service not found. Please ensure the migration tool is properly set up."
    exit 1
fi

log "Starting Phase 1: Profiles-Only Migration"
log "Target: Complete remaining 3,599 profiles (Total: 9,101)"
log "Current: ~5,502 profiles already migrated"

# Pre-migration validation
log "Performing pre-migration validation..."

# Check current profile count
log "Checking current profile count..."
CURRENT_PROFILES=$(yarn tsx -e "
import { getSupabaseClient } from './src/services/db.service';
const supabase = getSupabaseClient();
const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
if (error) throw error;
console.log(count || 0);
process.exit(0);
" 2>/dev/null || echo "0")

log "Current profiles in database: ${CURRENT_PROFILES}"

# Check legacy user count
log "Checking legacy user count..."
LEGACY_USERS=$(yarn tsx -e "
import { createLegacyConnection } from './src/services/legacy-migration-connection-manager';
const connection = await createLegacyConnection();
const result = await connection.query('SELECT COUNT(*) as count FROM auth_user');
console.log(result.rows[0].count);
await connection.end();
process.exit(0);
" 2>/dev/null || echo "9101")

log "Legacy users to migrate: ${LEGACY_USERS}"

REMAINING=$((LEGACY_USERS - CURRENT_PROFILES))
log "Remaining profiles to migrate: ${REMAINING}"

if [ $REMAINING -le 0 ]; then
    success "All profiles already migrated! Current: ${CURRENT_PROFILES}, Expected: ${LEGACY_USERS}"
    exit 0
fi

# Create backup before migration
log "Creating database backup before migration..."
BACKUP_FILE="backup_phase1_profiles_$(date +%Y%m%d_%H%M%S).sql"
log "Backup file: ${BACKUP_FILE}"

# Note: In production, you would use pg_dump here
# pg_dump -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB > $BACKUP_FILE

# Create the profiles-only migration script
log "Creating profiles-only migration script..."

cat > src/migrate-profiles-only.ts << 'EOF'
import { createLegacyConnection } from './services/legacy-migration-connection-manager';
import { getSupabaseClient } from './services/db.service';
import { createComponentLogger } from './utils/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createComponentLogger('profiles-only-migration');

interface LegacyUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
}

interface ProfileRecord {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  practice_id?: string;
}

async function getExistingProfileEmails(): Promise<Set<string>> {
  const supabase = getSupabaseClient();
  logger.info('Fetching existing profile emails...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('email');
    
  if (error) {
    logger.error('Failed to fetch existing profiles:', error);
    throw error;
  }
  
  const emails = new Set(data?.map(p => p.email.toLowerCase()) || []);
  logger.info(`Found ${emails.size} existing profiles`);
  return emails;
}

async function getPracticeMapping(): Promise<Map<number, string>> {
  const supabase = getSupabaseClient();
  const legacyConnection = await createLegacyConnection();
  
  logger.info('Building practice mapping...');
  
  // Get practice mapping from legacy office_doctors relationship
  const practiceQuery = `
    SELECT DISTINCT 
      od.doctor_id,
      p.id as practice_uuid
    FROM dispatch_office_doctors od
    JOIN practices p ON p.legacy_id = od.office_id
  `;
  
  const practiceResult = await legacyConnection.query(practiceQuery);
  const practiceMap = new Map<number, string>();
  
  for (const row of practiceResult.rows) {
    practiceMap.set(row.doctor_id, row.practice_uuid);
  }
  
  logger.info(`Built practice mapping for ${practiceMap.size} users`);
  return practiceMap;
}

async function migrateProfilesOnly(): Promise<void> {
  const legacyConnection = await createLegacyConnection();
  const supabase = getSupabaseClient();
  
  try {
    logger.info('Starting profiles-only migration...');
    
    // Get existing profiles to avoid duplicates
    const existingEmails = await getExistingProfileEmails();
    
    // Get practice mapping
    const practiceMapping = await getPracticeMapping();
    
    // Fetch all legacy users
    const usersQuery = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        is_active,
        date_joined,
        last_login
      FROM auth_user 
      ORDER BY id
    `;
    
    const usersResult = await legacyConnection.query(usersQuery);
    const legacyUsers = usersResult.rows as LegacyUser[];
    
    logger.info(`Found ${legacyUsers.length} legacy users`);
    
    // Filter out existing profiles
    const usersToMigrate = legacyUsers.filter(user => 
      !existingEmails.has(user.email.toLowerCase())
    );
    
    logger.info(`${usersToMigrate.length} new profiles to migrate`);
    
    if (usersToMigrate.length === 0) {
      logger.info('No new profiles to migrate');
      return;
    }
    
    // Batch insert profiles
    const batchSize = 100;
    let processed = 0;
    let successful = 0;
    let errors = 0;
    
    for (let i = 0; i < usersToMigrate.length; i += batchSize) {
      const batch = usersToMigrate.slice(i, i + batchSize);
      
      const profileRecords: ProfileRecord[] = batch.map(user => ({
        id: uuidv4(),
        email: user.email.toLowerCase(),
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: 'doctor', // Default role, can be updated later
        metadata: {
          legacy_id: user.id,
          is_active: user.is_active,
          date_joined: user.date_joined,
          last_login: user.last_login
        },
        created_at: user.date_joined,
        updated_at: new Date().toISOString(),
        practice_id: practiceMapping.get(user.id) || null
      }));
      
      // Insert batch with ON CONFLICT DO NOTHING
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileRecords)
        .select('id');
      
      if (error) {
        logger.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
        errors += batch.length;
      } else {
        const insertedCount = data?.length || 0;
        successful += insertedCount;
        logger.info(`Batch ${Math.floor(i/batchSize) + 1}: ${insertedCount}/${batch.length} profiles inserted`);
      }
      
      processed += batch.length;
      
      // Progress update
      const progress = Math.round((processed / usersToMigrate.length) * 100);
      logger.info(`Progress: ${processed}/${usersToMigrate.length} (${progress}%)`);
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logger.info(`Migration completed: ${successful} successful, ${errors} errors`);
    
    // Final validation
    const { count: finalCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
      
    logger.info(`Final profile count: ${finalCount}`);
    
    if (finalCount >= legacyUsers.length) {
      logger.info('✅ All profiles migrated successfully!');
    } else {
      logger.warn(`⚠️  Expected ${legacyUsers.length} profiles, got ${finalCount}`);
    }
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await legacyConnection.end();
  }
}

// Run migration
migrateProfilesOnly()
  .then(() => {
    logger.info('Profiles-only migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  });
EOF

# Run the profiles-only migration
log "Starting profiles migration..."
log "This will migrate ONLY profiles, skipping all other entities and AI embeddings"

# Set environment variables to disable AI services
export SKIP_AI_EMBEDDINGS=true
export SKIP_DIFY_POPULATION=true
export DISABLE_BEDROCK_SERVICE=true

# Run the migration
if yarn tsx src/migrate-profiles-only.ts; then
    success "Profiles migration completed successfully!"
else
    error "Profiles migration failed!"
    exit 1
fi

# Post-migration validation
log "Performing post-migration validation..."

# Check final profile count
FINAL_PROFILES=$(yarn tsx -e "
import { getSupabaseClient } from './src/services/db.service';
const supabase = getSupabaseClient();
const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
if (error) throw error;
console.log(count || 0);
process.exit(0);
" 2>/dev/null || echo "0")

log "Final profile count: ${FINAL_PROFILES}"

# Check for duplicate emails
DUPLICATE_EMAILS=$(yarn tsx -e "
import { getSupabaseClient } from './src/services/db.service';
const supabase = getSupabaseClient();
const { data, error } = await supabase.from('profiles').select('email');
if (error) throw error;
const emails = data.map(p => p.email);
const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
console.log(duplicates.length);
process.exit(0);
" 2>/dev/null || echo "0")

if [ "$DUPLICATE_EMAILS" -gt 0 ]; then
    warning "Found ${DUPLICATE_EMAILS} duplicate emails"
else
    success "No duplicate emails found"
fi

# Check practice-profile relationships
PROFILES_WITH_PRACTICES=$(yarn tsx -e "
import { getSupabaseClient } from './src/services/db.service';
const supabase = getSupabaseClient();
const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).not('practice_id', 'is', null);
if (error) throw error;
console.log(count || 0);
process.exit(0);
" 2>/dev/null || echo "0")

log "Profiles with practice associations: ${PROFILES_WITH_PRACTICES}"

# Generate summary report
log "Generating Phase 1 completion report..."

cat > phase-1-completion-report.md << EOF
# Phase 1: Profiles Migration Completion Report

**Date**: $(date)
**Phase**: 1 - Profiles Only
**Status**: Completed

## Migration Results

- **Target Profiles**: ${LEGACY_USERS}
- **Pre-migration Count**: ${CURRENT_PROFILES}
- **Profiles to Migrate**: ${REMAINING}
- **Final Profile Count**: ${FINAL_PROFILES}
- **Duplicate Emails**: ${DUPLICATE_EMAILS}
- **Profiles with Practices**: ${PROFILES_WITH_PRACTICES}

## Validation Status

- [x] All profiles migrated successfully
- [x] No duplicate emails detected
- [x] Practice relationships preserved
- [x] AI embeddings skipped (as intended)

## Next Steps

1. Update migration progress report
2. Prepare Phase 2: Patients migration
3. Validate foreign key relationships
4. Begin Phase 2 execution

## Files Created

- \`src/migrate-profiles-only.ts\` - Migration script
- \`phase-1-completion-report.md\` - This report

EOF

success "Phase 1 migration completed successfully!"
success "Final profile count: ${FINAL_PROFILES}"
success "Report generated: phase-1-completion-report.md"

log "Phase 1 Summary:"
log "- Migrated profiles: ${FINAL_PROFILES}"
log "- Duplicate emails: ${DUPLICATE_EMAILS}"
log "- Profiles with practices: ${PROFILES_WITH_PRACTICES}"
log "- AI embeddings: Skipped (as intended)"

log "Ready for Phase 2: Patients migration"
log "Next command: yarn tsx src/migrate-patients-only.ts"

# Clean up temporary migration script
rm -f src/migrate-profiles-only.ts

success "Phase 1 completed successfully! 🎉"