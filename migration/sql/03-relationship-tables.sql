-- =====================================================
-- Supabase Schema Creation: Relationship Tables
-- =====================================================
-- This script creates tables with foreign key relationships: orders, projects, messages
-- Based on legacy dispatch_instruction, dispatch_project, dispatch_record analysis

-- =====================================================
-- Orders Table (Instructions from Legacy)
-- =====================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_instruction_id INTEGER UNIQUE, -- Maps to dispatch_instruction.id
    order_number TEXT NOT NULL UNIQUE,
    order_type_id UUID NOT NULL REFERENCES order_types(id),
    patient_id UUID NOT NULL REFERENCES profiles(id),
    doctor_id UUID NOT NULL REFERENCES profiles(id),
    office_id UUID NOT NULL REFERENCES offices(id),
    current_state_id UUID REFERENCES order_states(id),
    
    title TEXT,
    description TEXT,
    priority TEXT DEFAULT 'normal',
    
    -- Financial information
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    custom_price DECIMAL(10,2), -- Maps to dispatch_order.custom_price
    
    -- Legacy instruction fields
    notes TEXT, -- Maps to dispatch_instruction.notes
    model_id INTEGER, -- Maps to dispatch_instruction.model
    scanner_id INTEGER, -- Maps to dispatch_instruction.scanner
    scanner_notes TEXT DEFAULT '', -- Maps to dispatch_instruction.scanner_notes
    exports TEXT DEFAULT '', -- Maps to dispatch_instruction.exports
    conditions TEXT DEFAULT '', -- Maps to dispatch_instruction.conditions
    complaint TEXT DEFAULT '', -- Maps to dispatch_instruction.complaint
    objective TEXT DEFAULT '', -- Maps to dispatch_instruction.objective
    
    -- Treatment options
    cbct BOOLEAN DEFAULT false, -- Maps to dispatch_instruction.cbct
    accept_extraction BOOLEAN DEFAULT false, -- Maps to dispatch_instruction.accept_extraction
    comprehensive BOOLEAN DEFAULT false, -- Maps to dispatch_instruction.comprehensive
    
    -- Jaw references
    upper_jaw_id INTEGER, -- Maps to dispatch_instruction.upper_jaw_id
    lower_jaw_id INTEGER, -- Maps to dispatch_instruction.lower_jaw_id
    
    -- Status and workflow
    status INTEGER, -- Maps to dispatch_instruction.status
    suffix TEXT NOT NULL DEFAULT '', -- Maps to dispatch_instruction.suffix
    is_deleted BOOLEAN DEFAULT false, -- Maps to dispatch_instruction.deleted
    
    -- Extensible data validated by order_type.schema
    data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    submitted_at TIMESTAMPTZ, -- Maps to dispatch_instruction.submitted_at
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(), -- Maps to dispatch_instruction.updated_at
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    CONSTRAINT check_patient_profile_type CHECK (
        (SELECT profile_type FROM profiles WHERE id = patient_id) = 'patient'
    ),
    CONSTRAINT check_doctor_profile_type CHECK (
        (SELECT profile_type FROM profiles WHERE id = doctor_id) = 'doctor'
    )
);

-- Orders indexes
CREATE INDEX idx_orders_legacy_id ON orders(legacy_instruction_id);
CREATE INDEX idx_orders_patient ON orders(patient_id);
CREATE INDEX idx_orders_doctor ON orders(doctor_id);
CREATE INDEX idx_orders_office ON orders(office_id);
CREATE INDEX idx_orders_state ON orders(current_state_id);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_order_type ON orders(order_type_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_submitted ON orders(submitted_at);
CREATE INDEX idx_orders_deleted ON orders(is_deleted) WHERE is_deleted = false;

-- =====================================================
-- Projects Table (3D Files and Assets)
-- =====================================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_project_id INTEGER UNIQUE, -- Maps to dispatch_project.id
    legacy_uid UUID, -- Maps to dispatch_project.uid
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES offices(id),
    creator_id UUID NOT NULL REFERENCES profiles(id),
    
    project_number TEXT NOT NULL,
    name TEXT NOT NULL, -- Maps to dispatch_project.name
    description TEXT,
    
    project_type project_type_enum NOT NULL,
    status project_status_enum NOT NULL DEFAULT 'draft',
    
    -- File management
    file_size BIGINT DEFAULT 0, -- Maps to dispatch_project.size
    storage_path TEXT, -- Supabase Storage path
    storage_bucket TEXT DEFAULT 'projects',
    mime_type TEXT,
    
    -- Legacy project fields
    legacy_type INTEGER, -- Maps to dispatch_project.type
    legacy_status INTEGER, -- Maps to dispatch_project.status
    is_public BOOLEAN DEFAULT false, -- Maps to dispatch_project.public
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_project_id UUID REFERENCES projects(id),
    
    metadata JSONB DEFAULT '{}',
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(), -- Maps to dispatch_project.created_at
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(office_id, project_number)
);

-- Projects indexes
CREATE INDEX idx_projects_legacy_id ON projects(legacy_project_id);
CREATE INDEX idx_projects_legacy_uid ON projects(legacy_uid);
CREATE INDEX idx_projects_order ON projects(order_id);
CREATE INDEX idx_projects_office ON projects(office_id);
CREATE INDEX idx_projects_creator ON projects(creator_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_type ON projects(project_type);
CREATE INDEX idx_projects_created ON projects(created_at);
CREATE INDEX idx_projects_public ON projects(is_public);

-- =====================================================
-- Message Types
-- =====================================================

CREATE TABLE message_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    key TEXT NOT NULL UNIQUE,
    category TEXT, -- 'system', 'user', 'notification', 'workflow'
    description TEXT,
    triggers_state_change BOOLEAN DEFAULT false,
    target_state_id UUID REFERENCES order_states(id),
    template TEXT, -- Message template for automation
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Types indexes
CREATE INDEX idx_message_types_category ON message_types(category);
CREATE INDEX idx_message_types_key ON message_types(key);
CREATE INDEX idx_message_types_active ON message_types(is_active);

-- =====================================================
-- Messages Table (Records from Legacy)
-- =====================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_record_id INTEGER UNIQUE, -- Maps to dispatch_record.id
    message_type_id UUID NOT NULL REFERENCES message_types(id),
    order_id UUID REFERENCES orders(id),
    project_id UUID REFERENCES projects(id),
    sender_id UUID REFERENCES profiles(id),
    recipient_id UUID REFERENCES profiles(id),
    
    subject TEXT,
    body TEXT NOT NULL,
    
    -- State management
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    requires_response BOOLEAN DEFAULT false,
    response_due_date TIMESTAMPTZ,
    
    -- Attachments
    attachments JSONB DEFAULT '[]', -- Array of file references
    
    -- Legacy fields for ContentTypes normalization
    legacy_content_type_id INTEGER, -- Original ContentType reference
    legacy_object_id INTEGER, -- Original object_id
    legacy_model_name TEXT, -- Resolved model name for reference
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_message_entity CHECK (
        (order_id IS NOT NULL) OR (project_id IS NOT NULL)
    )
);

-- Messages indexes
CREATE INDEX idx_messages_legacy_id ON messages(legacy_record_id);
CREATE INDEX idx_messages_order ON messages(order_id);
CREATE INDEX idx_messages_project ON messages(project_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_type ON messages(message_type_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_unread ON messages(is_read) WHERE is_read = false;
CREATE INDEX idx_messages_legacy_content ON messages(legacy_content_type_id, legacy_object_id);

-- =====================================================
-- Insert Default Message Types
-- =====================================================

INSERT INTO message_types (name, key, category, description) VALUES
    ('General Message', 'general', 'user', 'General communication'),
    ('Status Update', 'status_update', 'system', 'Automated status updates'),
    ('Question', 'question', 'user', 'Questions requiring response'),
    ('Instruction', 'instruction', 'workflow', 'Treatment instructions'),
    ('Approval Request', 'approval_request', 'workflow', 'Requests for approval'),
    ('System Notification', 'system_notification', 'system', 'Automated notifications'),
    ('File Upload', 'file_upload', 'system', 'File upload notifications'),
    ('State Change', 'state_change', 'system', 'Order state change notifications');

-- =====================================================
-- Workflow Templates
-- =====================================================

CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_template_id INTEGER UNIQUE, -- Maps to dispatch_template.id
    name TEXT NOT NULL,
    description TEXT,
    order_type_id UUID REFERENCES order_types(id),
    is_predefined BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Templates indexes
CREATE INDEX idx_workflow_templates_legacy_id ON workflow_templates(legacy_template_id);
CREATE INDEX idx_workflow_templates_order_type ON workflow_templates(order_type_id);
CREATE INDEX idx_workflow_templates_active ON workflow_templates(is_active);

-- =====================================================
-- Workflow Tasks
-- =====================================================

CREATE TABLE workflow_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    task_order INTEGER NOT NULL,
    function_type task_function_enum NOT NULL,
    action_name TEXT,
    text_prompt TEXT,
    estimated_duration INTERVAL,
    required_roles profile_type[],
    auto_transition BOOLEAN DEFAULT false,
    predecessor_tasks UUID[], -- Array of task IDs that must complete first
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_template_id, task_order)
);

-- Workflow Tasks indexes
CREATE INDEX idx_workflow_tasks_template ON workflow_tasks(workflow_template_id);
CREATE INDEX idx_workflow_tasks_function ON workflow_tasks(function_type);
CREATE INDEX idx_workflow_tasks_order ON workflow_tasks(task_order);

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON TABLE orders IS 'Orders table mapping from dispatch_instruction with all legacy fields preserved';
COMMENT ON TABLE projects IS '3D project files and assets mapping from dispatch_project';
COMMENT ON TABLE messages IS 'Communication records with ContentTypes normalization from dispatch_record';
COMMENT ON TABLE message_types IS 'Message categorization for workflow automation';
COMMENT ON TABLE workflow_templates IS 'Workflow templates for order processing automation';
COMMENT ON TABLE workflow_tasks IS 'Individual tasks within workflow templates';

COMMENT ON COLUMN orders.legacy_instruction_id IS 'Maps to dispatch_instruction.id for backward compatibility';
COMMENT ON COLUMN projects.legacy_project_id IS 'Maps to dispatch_project.id for backward compatibility';
COMMENT ON COLUMN messages.legacy_record_id IS 'Maps to dispatch_record.id for backward compatibility';
COMMENT ON COLUMN messages.legacy_content_type_id IS 'Original ContentType ID for reference during migration';