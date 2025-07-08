/**
 * Database Types for AI-Ready MDW Supabase Schema
 * 
 * Generated from: AI_READY_MDW_SCHEMA_DESIGN.md
 * 
 * This file contains complete TypeScript types for the new AI-ready
 * Medical Design Workflow database schema using UUIDs as primary keys.
 */

// Enum Types
export type UserRole = 'patient' | 'doctor' | 'technician' | 'admin' | 'support';
export type PracticeRole = 'owner' | 'doctor' | 'technician' | 'assistant' | 'admin';
export type GenderType = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type CaseType = 'initial_consultation' | 'treatment_planning' | 'active_treatment' | 'refinement' | 'retention' | 'emergency' | 'follow_up';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type CaseStateEnum = 'submitted' | 'under_review' | 'planning' | 'approved' | 'in_production' | 'quality_check' | 'shipped' | 'delivered' | 'completed' | 'on_hold' | 'cancelled';
export type OrderState = 'pending' | 'confirmed' | 'in_production' | 'quality_check' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
export type ProductCategory = 'aligners' | 'retainers' | 'appliances' | 'accessories' | 'services';
export type MessageType = 'general' | 'status_update' | 'question' | 'instruction' | 'approval_request' | 'system_notification';
export type FileType = 'scan' | 'photo' | 'xray' | 'document' | 'model' | 'simulation' | 'other';
export type EmbeddingContentType = 'case_summary' | 'treatment_plan' | 'notes' | 'diagnosis';

// Core Table Interfaces
export interface Profile {
  id: string; // UUID - references auth.users(id)
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Practice {
  id: string; // UUID
  name: string;
  address?: Record<string, unknown>; // JSONB
  phone?: string;
  email?: string;
  license_number?: string;
  settings: Record<string, unknown>; // JSONB
  created_at: string;
  updated_at: string;
}

export interface PracticeMember {
  id: string; // UUID
  practice_id: string; // UUID
  profile_id: string; // UUID
  practitioner_id?: string; // UUID
  role: PracticeRole;
  permissions: Record<string, unknown>; // JSONB
  joined_at: string;
}

export interface Patient {
  id: string; // UUID
  profile_id: string; // UUID
  practice_id: string; // UUID
  patient_number: string;
  date_of_birth?: string;
  gender?: GenderType;
  medical_history: Record<string, unknown>; // JSONB
  preferences: Record<string, unknown>; // JSONB
  emergency_contact?: Record<string, unknown>; // JSONB
  created_at: string;
  updated_at: string;
}

export interface Practitioner {
  id: string; // UUID
  profile_id: string; // UUID
  license_number?: string;
  specialties?: string[];
  credentials: Record<string, unknown>; // JSONB
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string; // UUID
  patient_id: string; // UUID
  practice_id: string; // UUID
  assigned_practitioner_id?: string; // UUID
  case_number: string;
  title: string;
  description?: string;
  case_type: CaseType;
  priority: PriorityLevel;
  current_state: CaseStateEnum;
  workflow_template_id?: string; // UUID
  metadata: Record<string, unknown>; // JSONB
  created_at: string;
  updated_at: string;
}

export interface CaseStateHistory {
  id: string; // UUID
  case_id: string; // UUID
  from_state?: CaseStateEnum;
  to_state: CaseStateEnum;
  changed_by: string; // UUID
  reason?: string;
  metadata: Record<string, unknown>; // JSONB
  created_at: string;
}

export interface Order {
  id: string; // UUID
  case_id: string; // UUID
  practice_id: string; // UUID
  order_number: string;
  current_state: OrderState;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  metadata: Record<string, unknown>; // JSONB
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string; // UUID
  order_id: string; // UUID
  product_id: string; // UUID
  quantity: number;
  unit_price: number;
  total_price: number;
  customizations: Record<string, unknown>; // JSONB
  created_at: string;
}

export interface Product {
  id: string; // UUID
  name: string;
  description?: string;
  category: ProductCategory;
  base_price: number;
  customizable_options: Record<string, unknown>; // JSONB
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderStateHistory {
  id: string; // UUID
  order_id: string; // UUID
  from_state?: OrderState;
  to_state: OrderState;
  changed_by: string; // UUID
  reason?: string;
  metadata: Record<string, unknown>; // JSONB
  created_at: string;
}

export interface CaseMessage {
  id: string; // UUID
  case_id: string; // UUID
  sender_id: string; // UUID
  message_type: MessageType;
  subject?: string;
  content: string;
  attachments: unknown[]; // JSONB array
  read_by: Record<string, unknown>; // JSONB
  metadata: Record<string, unknown>; // JSONB
  created_at: string;
}

export interface CaseFile {
  id: string; // UUID
  case_id: string; // UUID
  uploaded_by: string; // UUID
  file_name: string;
  file_type: FileType;
  file_size: number;
  storage_path: string;
  mime_type: string;
  metadata: Record<string, unknown>; // JSONB
  created_at: string;
}

export interface CaseEmbedding {
  id: string; // UUID
  case_id: string; // UUID
  content_type: EmbeddingContentType;
  content_text: string;
  embedding: number[]; // VECTOR(1536)
  metadata: Record<string, unknown>; // JSONB
  created_at: string;
}

export interface PatientEmbedding {
  id: string; // UUID
  patient_id: string; // UUID
  content_type: EmbeddingContentType;
  content_text: string;
  embedding: number[]; // VECTOR(1536)
  metadata: Record<string, unknown>; // JSONB
  created_at: string;
}

export interface MessageEmbedding {
  id: string; // UUID
  message_id: string; // UUID
  content_text: string;
  embedding: number[]; // VECTOR(1536)
  metadata: Record<string, unknown>; // JSONB
  created_at: string;
}

export interface WorkflowTemplate {
  id: string; // UUID
  name: string;
  description?: string;
  case_type: CaseType;
  active: boolean;
  metadata: Record<string, unknown>; // JSONB
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string; // UUID
  workflow_template_id: string; // UUID
  step_order: number;
  name: string;
  description?: string;
  state: CaseStateEnum;
  auto_transition: boolean;
  required_roles?: PracticeRole[];
  estimated_duration?: string; // INTERVAL
  metadata: Record<string, unknown>; // JSONB
}

// Database Interface
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      practices: {
        Row: Practice;
        Insert: Omit<Practice, 'id' | 'created_at' | 'updated_at' | 'settings'> & {
          id?: string;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Practice, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      practice_members: {
        Row: PracticeMember;
        Insert: Omit<PracticeMember, 'id' | 'joined_at' | 'permissions'> & {
          id?: string;
          permissions?: Record<string, unknown>;
          joined_at?: string;
        };
        Update: Partial<Omit<PracticeMember, 'id' | 'joined_at'>>;
      };
      patients: {
        Row: Patient;
        Insert: Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'medical_history' | 'preferences'> & {
          id?: string;
          medical_history?: Record<string, unknown>;
          preferences?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Patient, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      practitioners: {
        Row: Practitioner;
        Insert: Omit<Practitioner, 'id' | 'created_at' | 'updated_at' | 'credentials'> & {
          id?: string;
          credentials?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Practitioner, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      cases: {
        Row: Case;
        Insert: Omit<Case, 'id' | 'created_at' | 'updated_at' | 'metadata' | 'priority' | 'current_state'> & {
          id?: string;
          priority?: PriorityLevel;
          current_state?: CaseStateEnum;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Case, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      case_states: {
        Row: CaseStateEnum;
        Insert: Omit<CaseStateEnum, 'id' | 'created_at' | 'metadata'> & {
          id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Omit<CaseStateEnum, 'id' | 'created_at'>>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'metadata' | 'current_state' | 'subtotal' | 'tax_amount' | 'total_amount' | 'currency'> & {
          id?: string;
          current_state?: OrderState;
          subtotal?: number;
          tax_amount?: number;
          total_amount?: number;
          currency?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Order, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, 'id' | 'created_at' | 'customizations' | 'quantity'> & {
          id?: string;
          quantity?: number;
          customizations?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Omit<OrderItem, 'id' | 'created_at'>>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'customizable_options' | 'active'> & {
          id?: string;
          customizable_options?: Record<string, unknown>;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Product, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      order_states: {
        Row: OrderStateHistory;
        Insert: Omit<OrderStateHistory, 'id' | 'created_at' | 'metadata'> & {
          id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Omit<OrderStateHistory, 'id' | 'created_at'>>;
      };
      case_messages: {
        Row: CaseMessage;
        Insert: Omit<CaseMessage, 'id' | 'created_at' | 'attachments' | 'read_by' | 'metadata' | 'message_type'> & {
          id?: string;
          message_type?: MessageType;
          attachments?: unknown[];
          read_by?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Omit<CaseMessage, 'id' | 'created_at'>>;
      };
      case_files: {
        Row: CaseFile;
        Insert: Omit<CaseFile, 'id' | 'created_at' | 'metadata'> & {
          id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Omit<CaseFile, 'id' | 'created_at'>>;
      };
      case_embeddings: {
        Row: CaseEmbedding;
        Insert: Omit<CaseEmbedding, 'id' | 'created_at' | 'metadata'> & {
          id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Omit<CaseEmbedding, 'id' | 'created_at'>>;
      };
      patient_embeddings: {
        Row: PatientEmbedding;
        Insert: Omit<PatientEmbedding, 'id' | 'created_at' | 'metadata'> & {
          id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Omit<PatientEmbedding, 'id' | 'created_at'>>;
      };
      message_embeddings: {
        Row: MessageEmbedding;
        Insert: Omit<MessageEmbedding, 'id' | 'created_at' | 'metadata'> & {
          id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Omit<MessageEmbedding, 'id' | 'created_at'>>;
      };
      workflow_templates: {
        Row: WorkflowTemplate;
        Insert: Omit<WorkflowTemplate, 'id' | 'created_at' | 'updated_at' | 'metadata' | 'active'> & {
          id?: string;
          active?: boolean;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<WorkflowTemplate, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      workflow_steps: {
        Row: WorkflowStep;
        Insert: Omit<WorkflowStep, 'id' | 'metadata' | 'auto_transition'> & {
          id?: string;
          auto_transition?: boolean;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<Omit<WorkflowStep, 'id'>>;
      };
    };
    Views: {
      case_dashboard: {
        Row: {
          id: string;
          case_number: string;
          title: string;
          current_state: CaseStateEnum;
          priority: PriorityLevel;
          created_at: string;
          patient_name: string;
          practitioner_name?: string;
          message_count: number;
          file_count: number;
          last_message_at?: string;
        };
      };
    };
    Functions: {
      search_cases_semantic: {
        Args: {
          query_text: string;
          match_threshold?: number;
          match_count?: number;
          practice_id?: string;
        };
        Returns: {
          case_id: string;
          similarity: number;
          content_text: string;
        }[];
      };
      search_patients_semantic: {
        Args: {
          query_text: string;
          match_threshold?: number;
          match_count?: number;
          practice_id?: string;
        };
        Returns: {
          patient_id: string;
          similarity: number;
          content_text: string;
        }[];
      };
      refresh_case_dashboard: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      practice_role: PracticeRole;
      gender_type: GenderType;
      case_type_enum: CaseType;
      priority_level: PriorityLevel;
      case_state_enum: CaseStateEnum;
      order_state_enum: OrderState;
      product_category: ProductCategory;
      message_type_enum: MessageType;
      file_type_enum: FileType;
      embedding_content_type: EmbeddingContentType;
    };
  };
}

// Helper types for working with Supabase
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T];
export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T];
export type ViewRow<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];

export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T];
export type FunctionArgs<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]['Args'];
export type FunctionReturns<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]['Returns'];

export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Re-export for convenience
export default Database;