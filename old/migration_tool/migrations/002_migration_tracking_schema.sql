-- Migration Tracking Schema
-- This script creates the tables necessary for tracking the data migration process.
-- It is designed to be idempotent and can be run safely multiple times.

-- Create custom types for migration tracking
DO $$ BEGIN
    CREATE TYPE migration_type AS ENUM ('full', 'incremental');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE migration_run_status AS ENUM ('running', 'completed', 'failed', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table to log each migration run
CREATE TABLE IF NOT EXISTS migration_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type migration_type NOT NULL,
    status migration_run_status NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    log JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Single-row table to hold the current, live status of an active migration
CREATE TABLE IF NOT EXISTS migration_status (
    id INT PRIMARY KEY CHECK (id = 1), -- Enforce only one row
    current_step TEXT,
    progress_percentage INT,
    details TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime on the status table so the UI can subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE migration_status;

-- Procedure to initialize the single row in migration_status
CREATE OR REPLACE FUNCTION initialize_migration_status()
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migration_status WHERE id = 1) THEN
        INSERT INTO migration_status (id, current_step, progress_percentage, details)
        VALUES (1, 'Idle', 0, 'No migration in progress.');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Call the initialization function
SELECT initialize_migration_status();