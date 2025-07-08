#!/bin/bash

# Profiles-Only Migration Script
# Focus: Complete remaining ~3,599 profiles out of 9,101 total
# Strategy: Skip all other entities to avoid errors and side effects

echo "🎯 PROFILES-ONLY MIGRATION"
echo "=========================="
echo "Target: Complete remaining profiles migration"
echo "Expected: 9,101 total profiles"
echo "Current: ~5,502 profiles"
echo "Remaining: ~3,599 profiles"
echo ""

# Check current state first
echo "📊 Checking current database state..."
yarn tsx debug-migration-state.ts

echo ""
echo "🚀 Starting profiles-only migration..."
echo "Command: yarn run migrate:full with all skip flags except profiles"
echo ""

# Run migration with maximum skip flags to focus ONLY on profiles
yarn run migrate:full \
  --skip-practices \
  --skip-patients \
  --skip-cases \
  --skip-projects \
  --skip-practice-members \
  --skip-orders \
  --skip-patient-flags \
  --skip-case-flags \
  --skip-ai-embeddings \
  --skip-dify-population \
  --verbose

echo ""
echo "✅ Migration completed. Checking final state..."
yarn tsx debug-migration-state.ts

echo ""
echo "📋 Next Steps:"
echo "1. Verify profile count is 9,101"
echo "2. Check for any errors or duplicates"
echo "3. Prepare for Phase 2: Practices migration"