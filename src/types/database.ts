/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** Temporary mapping table for legacy ID to new UUID migration tracking */
export interface MigrationMappings {
  /**
   * Type of entity (user, patient, instruction, etc.)
   *
   * Note:
   * This is a Primary Key.<pk/>
   * @format text
   */
  entity_type: string;
  /**
   * Original integer ID from legacy system
   *
   * Note:
   * This is a Primary Key.<pk/>
   * @format integer
   */
  legacy_id: number;
  /**
   * New UUID in target system
   * @format uuid
   */
  new_id: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  migrated_at?: string;
  /**
   * Identifier for migration batch/run
   * @format text
   */
  migration_batch?: string;
  /** @format text */
  notes?: string;
}

/** Many-to-many relationship between doctors and offices */
export interface DoctorOffices {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Note:
   * This is a Foreign Key to `offices.id`.<fk table='offices' column='id'/>
   * @format uuid
   */
  office_id: string;
  /**
   * Whether this is the doctor's primary office
   * @format boolean
   * @default false
   */
  is_primary?: boolean;
  /**
   * When the doctor started at this office
   * @format date
   * @default "CURRENT_DATE"
   */
  start_date?: string;
  /**
   * When the doctor stopped working at this office (NULL = active)
   * @format date
   */
  end_date?: string;
  /**
   * Role or title at this office
   * @format text
   */
  role?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
  /** @format uuid */
  doctor_id: string;
}

/** Financial transactions for orders */
export interface Payments {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_payment.id from legacy system
   * @format integer
   */
  legacy_payment_id?: number;
  /** @format uuid */
  order_id: string;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  doctor_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `offices.id`.<fk table='offices' column='id'/>
   * @format uuid
   */
  office_id?: string;
  /**
   * Human-readable payment identifier
   * @format text
   */
  payment_number?: string;
  /** @format numeric */
  amount: number;
  /**
   * @format numeric
   * @default 0
   */
  tax_amount?: number;
  /** @format numeric */
  total_amount: number;
  /**
   * @format boolean
   * @default false
   */
  is_paid?: boolean;
  /**
   * @format boolean
   * @default false
   */
  is_cancelled?: boolean;
  /**
   * @format boolean
   * @default false
   */
  is_refunded?: boolean;
  /** @format text */
  payment_method?: string;
  /**
   * External payment processor transaction ID
   * @format text
   */
  transaction_id?: string;
  /** @format timestamp with time zone */
  payment_date?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
  /** @format jsonb */
  metadata?: any;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  patient_id?: string;
  /**
   * @format character varying
   * @maxLength 3
   * @default "USD"
   */
  currency?: string;
  /**
   * @format public.payment_status
   * @default "pending"
   */
  status?:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "refunded"
    | "cancelled";
  /** @format text */
  external_payment_id?: string;
  /** @format text */
  transaction_reference?: string;
  /** @format timestamp with time zone */
  processed_at?: string;
}

/** Orthodontic bracket configurations for 3D treatment planning */
export interface Brackets {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_bracket.id from legacy system
   * @format integer
   */
  legacy_bracket_id?: number;
  /**
   * Note:
   * This is a Foreign Key to `projects.id`.<fk table='projects' column='id'/>
   * @format uuid
   */
  project_id?: string;
  /** @format text */
  name?: string;
  /** @format text */
  bracket_type?: string;
  /**
   * JSON configuration for 3D bracket placement
   * @format jsonb
   */
  configuration?: any;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
}

/** Internal notes about doctors for administrative purposes */
export interface DoctorNotes {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_note.id from legacy system
   * @format integer
   */
  legacy_note_id?: number;
  /**
   * Doctor that this note is about
   *
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  doctor_id: string;
  /**
   * User who wrote this note
   *
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  author_id?: string;
  /** @format text */
  text: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /** @format jsonb */
  metadata?: any;
}

/** Task template dependencies - defines which tasks must be completed before others */
export interface TemplatePredecessors {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Template that depends on the predecessor
   *
   * Note:
   * This is a Foreign Key to `templates.id`.<fk table='templates' column='id'/>
   * @format uuid
   */
  template_id: string;
  /**
   * Template that must be completed first
   *
   * Note:
   * This is a Foreign Key to `templates.id`.<fk table='templates' column='id'/>
   * @format uuid
   */
  predecessor_id: string;
}

/** Line items for payments - detailed breakdown of what was purchased (maps to legacy wares) */
export interface PaymentItems {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_ware.id from legacy system
   * @format integer
   */
  legacy_ware_id?: number;
  /**
   * Note:
   * This is a Foreign Key to `payments.id`.<fk table='payments' column='id'/>
   * @format uuid
   */
  payment_id: string;
  /**
   * Note:
   * This is a Foreign Key to `products.id`.<fk table='products' column='id'/>
   * @format uuid
   */
  product_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `purchases.id`.<fk table='purchases' column='id'/>
   * @format uuid
   */
  purchase_id?: string;
  /** @format text */
  name: string;
  /**
   * @format integer
   * @default 1
   */
  quantity?: number;
  /** @format text */
  description?: string;
  /**
   * @format boolean
   * @default false
   */
  is_free?: boolean;
  /**
   * Standard global pricing for this item
   * @format numeric
   */
  global_price?: number;
  /**
   * Doctor-specific pricing if applicable
   * @format numeric
   */
  doctor_price?: number;
  /**
   * Base price before discounts
   * @format numeric
   */
  base_price: number;
  /** @format integer */
  discount_percent?: number;
  /** @format numeric */
  discount_amount?: number;
  /** @format numeric */
  discount_price?: number;
  /** @format text */
  discount_reason?: string;
  /** @format numeric */
  total_price: number;
  /** @format jsonb */
  metadata?: any;
}

/** Orthodontic treatment orders migrated from legacy dispatch_instruction table */
export interface Orders {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_instruction.id from legacy Django system
   * @format integer
   */
  legacy_instruction_id?: number;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  patient_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  doctor_id?: string;
  /** @format text */
  order_number: string;
  /**
   * @format text
   * @default ""
   */
  notes?: string;
  /**
   * @format text
   * @default ""
   */
  complaint?: string;
  /** @format timestamp with time zone */
  submitted_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
  /**
   * @format text
   * @default ""
   */
  exports?: string;
  /** @format jsonb */
  metadata?: any;
  /**
   * Note:
   * This is a Foreign Key to `offices.id`.<fk table='offices' column='id'/>
   * @format uuid
   */
  office_id?: string;
  /** @format public.course_type */
  course_type?:
    | "main"
    | "refinement"
    | "any"
    | "replacement"
    | "invoice"
    | "merchandise";
  /**
   * @format public.order_status
   * @default "no_product"
   */
  status:
    | "no_product"
    | "submitted"
    | "approved"
    | "in_production"
    | "shipped"
    | "add_plan"
    | "on_hold"
    | "cancelled";
  /** @format numeric */
  amount?: number;
  /** @format timestamp with time zone */
  approved_at?: string;
  /** @format timestamp with time zone */
  shipped_at?: string;
  /**
   * @format boolean
   * @default false
   */
  deleted?: boolean;
  /** @format timestamp with time zone */
  deleted_at?: string;
}

/** Order status history and workflow progression tracking */
export interface OrderStates {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Note:
   * This is a Foreign Key to `orders_backup_old.id`.<fk table='orders_backup_old' column='id'/>
   * @format uuid
   */
  order_id: string;
  /**
   * User who triggered this status change
   *
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  actor_id: string;
  /** @format text */
  reason?: string;
  /** @format jsonb */
  metadata?: any;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  changed_at?: string;
  /**
   * Maps to dispatch_state.id from legacy system
   * @format integer
   */
  legacy_state_id?: number;
  /**
   * Current order status in unified enum format
   * @format public.order_status
   */
  status?:
    | "no_product"
    | "submitted"
    | "approved"
    | "in_production"
    | "shipped"
    | "add_plan"
    | "on_hold"
    | "cancelled";
  /**
   * Maps to "on" field in legacy - whether this status is currently active
   * @format boolean
   */
  is_active?: boolean;
}

export interface LegacyUserMapping {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   */
  profile_id?: string;
  /** @format integer */
  legacy_user_id?: number;
  /** @format text */
  username?: string;
  /** @format text */
  email?: string;
  /** @format text */
  first_name?: string;
  /** @format text */
  last_name?: string;
  /** @format public.profile_type */
  profile_type?:
    | "patient"
    | "doctor"
    | "technician"
    | "master"
    | "sales_person"
    | "support_agent"
    | "admin";
  /** @format text */
  was_superuser?: string;
  /** @format text */
  was_staff?: string;
  /** @format jsonb */
  legacy_groups?: any;
  /** @format text */
  had_duplicate_email?: string;
}

/** Technician specializations and roles */
export interface TechnicianRoles {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_role.id from legacy system
   * @format integer
   */
  legacy_role_id?: number;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  technician_id: string;
  /** @format public.technician_type */
  role_type:
    | "sectioning"
    | "quality_control"
    | "designing"
    | "manufacturing"
    | "master"
    | "remote";
  /** @format text */
  role_name: string;
  /** @format text */
  abbreviation?: string;
  /**
   * @format boolean
   * @default true
   */
  is_active?: boolean;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  assigned_at?: string;
}

/** Comprehensive audit trail for all data changes */
export interface AuditLog {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Name of table that was modified
   * @format text
   */
  table_name: string;
  /**
   * UUID of the record that was modified
   * @format uuid
   */
  record_id: string;
  /**
   * Type of operation: INSERT, UPDATE, or DELETE
   * @format text
   */
  action: string;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  user_id?: string;
  /**
   * New data after the change
   * @format jsonb
   */
  changed_data?: any;
  /**
   * Data before the change (for UPDATE and DELETE)
   * @format jsonb
   */
  previous_data?: any;
  /** @format inet */
  ip_address?: string;
  /** @format text */
  user_agent?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
}

/** Workflow and manufacturing tasks */
export interface Tasks {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_task.id from legacy system
   * @format integer
   */
  legacy_task_id?: number;
  /** @format uuid */
  order_id: string;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  assigned_to?: string;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  assigned_by?: string;
  /**
   * Task template/type name
   * @format text
   */
  template_name: string;
  /** @format text */
  action_name?: string;
  /** @format text */
  description?: string;
  /**
   * 1=Both, 2=Upper, 3=Lower
   * @format integer
   */
  jaw_specification?: number;
  /**
   * @format public.task_status
   * @default "pending"
   */
  status:
    | "pending"
    | "in_progress"
    | "completed"
    | "approved"
    | "rejected"
    | "cancelled";
  /**
   * Legacy compatibility field for completion status
   * @format boolean
   * @default false
   */
  checked?: boolean;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  assigned_at?: string;
  /** @format timestamp with time zone */
  started_at?: string;
  /** @format timestamp with time zone */
  completed_at?: string;
  /** @format timestamp with time zone */
  approved_at?: string;
  /** @format timestamp with time zone */
  due_at?: string;
  /**
   * Quality assessment score from 0-100
   * @format integer
   */
  quality_score?: number;
  /** @format text */
  quality_notes?: string;
  /** @format jsonb */
  metadata?: any;
}

/** Unified table for all users and patients in the BRIUS system - v2.0 schema */
export interface Profiles {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /** @format text */
  email?: string;
  /** @format text */
  first_name: string;
  /** @format text */
  last_name: string;
  /** @format text */
  phone?: string;
  /** @format text */
  avatar_url?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
  /**
   * Maps to auth_user.id from legacy Django system
   * @format integer
   */
  legacy_user_id?: number;
  /**
   * Maps to dispatch_patient.id from legacy Django system
   * @format integer
   */
  legacy_patient_id?: number;
  /**
   * Determines the role and access level of the profile
   * @format public.profile_type
   */
  profile_type:
    | "patient"
    | "doctor"
    | "technician"
    | "master"
    | "sales_person"
    | "support_agent"
    | "admin";
  /** @format date */
  date_of_birth?: string;
  /**
   * @format public.gender
   * @default "unknown"
   */
  gender?: "male" | "female" | "other" | "unknown";
  /** @format text */
  username?: string;
  /** @format text */
  password_hash?: string;
  /**
   * @format boolean
   * @default true
   */
  is_active?: boolean;
  /**
   * @format boolean
   * @default false
   */
  is_verified?: boolean;
  /**
   * @format boolean
   * @default false
   */
  archived?: boolean;
  /**
   * @format boolean
   * @default false
   */
  suspended?: boolean;
  /** @format timestamp with time zone */
  last_login_at?: string;
  /**
   * Patient identifier suffix like 51Bn from legacy system
   * @format text
   */
  patient_suffix?: string;
  /**
   * Patient insurance and payment schemes from legacy
   * @format jsonb
   */
  insurance_info?: any;
  /**
   * Patient medical history, conditions, and allergies
   * @format jsonb
   */
  medical_history?: any;
  /** @format jsonb */
  metadata?: any;
}

/** Pricing offers for products, potentially customized per doctor */
export interface Offers {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_offer.id from legacy system
   * @format integer
   */
  legacy_offer_id?: number;
  /**
   * Note:
   * This is a Foreign Key to `products.id`.<fk table='products' column='id'/>
   * @format uuid
   */
  product_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  doctor_id?: string;
  /**
   * Price for both upper and lower jaws
   * @format numeric
   */
  price_both?: number;
  /**
   * Price for upper jaw only
   * @format numeric
   */
  price_upper?: number;
  /**
   * Price for lower jaw only
   * @format numeric
   */
  price_lower?: number;
  /**
   * @format boolean
   * @default true
   */
  is_active?: boolean;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
  /** @format jsonb */
  metadata?: any;
}

/** Individual payment and refund transactions with external payment processor integration */
export interface PaymentOperations {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_operation.id from legacy system
   * @format integer
   */
  legacy_operation_id?: number;
  /**
   * Note:
   * This is a Foreign Key to `payments.id`.<fk table='payments' column='id'/>
   * @format uuid
   */
  payment_id: string;
  /**
   * Type of operation: payment or refund
   * @format text
   */
  operation_type: string;
  /** @format numeric */
  amount: number;
  /**
   * Square payment processor order ID
   * @format text
   */
  square_order_id?: string;
  /** @format text */
  square_payment_id?: string;
  /** @format text */
  square_refund_id?: string;
  /** @format text */
  card_brand?: string;
  /** @format text */
  card_bin?: string;
  /**
   * Last 4 digits of card number (masked)
   * @format text
   */
  card_last_four?: string;
  /**
   * @format boolean
   * @default false
   */
  is_office_card?: boolean;
  /**
   * @format integer
   * @default 0
   */
  attempt_count?: number;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  processed_at?: string;
  /** @format jsonb */
  metadata?: any;
}

/** Task templates for workflow automation and manufacturing processes */
export interface Templates {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_template.id from legacy system
   * @format integer
   */
  legacy_template_id?: number;
  /**
   * Name of the task template
   * @format text
   */
  task_name: string;
  /** @format text */
  action_name?: string;
  /** @format text */
  text_name?: string;
  /** @format public.course_type */
  course_type?:
    | "main"
    | "refinement"
    | "any"
    | "replacement"
    | "invoice"
    | "merchandise";
  /**
   * @format boolean
   * @default false
   */
  is_separate?: boolean;
  /**
   * Type of user interaction required for this task
   * @format text
   */
  function_type?: string;
  /** @format text */
  file_extensions?: string;
  /**
   * @format integer
   * @default 0
   */
  duration_minutes?: number;
  /**
   * Order status that triggers this task
   * @format public.order_status
   */
  status_trigger?:
    | "no_product"
    | "submitted"
    | "approved"
    | "in_production"
    | "shipped"
    | "add_plan"
    | "on_hold"
    | "cancelled";
  /**
   * Note:
   * This is a Foreign Key to `categories.id`.<fk table='categories' column='id'/>
   * @format uuid
   */
  category_id?: string;
  /**
   * @format boolean
   * @default false
   */
  is_predefined?: boolean;
  /**
   * @format boolean
   * @default false
   */
  is_readonly?: boolean;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
  /** @format jsonb */
  metadata?: any;
}

/** System-wide configuration settings and feature flags (singleton table) */
export interface GlobalSettings {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "00000000-0000-0000-0000-000000000000"
   */
  id: string;
  /**
   * @format integer
   * @default 1
   */
  version?: number;
  /**
   * JSON object containing feature flags and their states
   * @format jsonb
   */
  features?: any;
  /**
   * Date when discount counters were last reset
   * @format date
   */
  reset_discount_date?: string;
  /**
   * @format boolean
   * @default false
   */
  use_weights?: boolean;
  /**
   * @format integer
   * @default 1
   */
  crown_weight?: number;
  /**
   * @format integer
   * @default 1
   */
  inner_root_weight?: number;
  /**
   * @format integer
   * @default 4
   */
  outer_root_weight?: number;
  /**
   * JSON configuration for customer/pricing tiers
   * @format jsonb
   */
  tiers?: any;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
}

/** Dental and orthodontic practices and offices */
export interface Offices {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_office.id from legacy Django system
   * @format integer
   */
  legacy_office_id?: number;
  /** @format text */
  name: string;
  /** @format text */
  phone?: string;
  /** @format text */
  email?: string;
  /** @format text */
  website?: string;
  /** @format text */
  address_line1?: string;
  /** @format text */
  address_line2?: string;
  /** @format text */
  city?: string;
  /** @format text */
  state?: string;
  /** @format text */
  zip?: string;
  /**
   * @format text
   * @default "'US'::character varying"
   */
  country?: string;
  /** @format numeric */
  tax_rate?: number;
  /** @format text */
  tax_id?: string;
  /**
   * Square payment processing customer ID
   * @format text
   */
  square_customer_id?: string;
  /**
   * NetSuite ERP integration identifier
   * @format text
   */
  netsuite_id?: string;
  /**
   * @format boolean
   * @default true
   */
  is_active?: boolean;
  /**
   * @format boolean
   * @default true
   */
  email_notifications?: boolean;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
  /** @format jsonb */
  metadata?: any;
}

export interface MigrationRuns {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /** @format public.migration_type */
  type: "full" | "incremental";
  /** @format public.migration_run_status */
  status: "running" | "completed" | "failed" | "pending";
  /** @format timestamp with time zone */
  start_time: string;
  /** @format timestamp with time zone */
  end_time?: string;
  /** @format jsonb */
  log?: any;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
}

/** Computational processing agents for 3D modeling, simulation, and analysis */
export interface ComputationalAgents {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_agent.id from legacy system
   * @format integer
   */
  legacy_agent_id?: number;
  /** @format text */
  name: string;
  /** @format text */
  address?: string;
  /**
   * @format integer
   * @default 0
   */
  port?: number;
  /**
   * @format integer
   * @default 1
   */
  cpu_count?: number;
  /**
   * @format integer
   * @default 1
   */
  memory_gb?: number;
  /**
   * @format integer
   * @default 0
   */
  memory_used_gb?: number;
  /**
   * JSON object describing agent capabilities (ABAQUS, LCP_SERVER, etc.)
   * @format jsonb
   */
  capabilities?: any;
  /**
   * @format boolean
   * @default true
   */
  is_active?: boolean;
  /**
   * Last time agent reported its status
   * @format timestamp with time zone
   */
  last_heartbeat?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
}

/** Product catalog for orthodontic treatments */
export interface Products {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /** @format text */
  name: string;
  /** @format text */
  description?: string;
  /** @format numeric */
  base_price: number;
  /** @format jsonb */
  customizable_options?: any;
  /**
   * @format boolean
   * @default true
   */
  active?: boolean;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
  /**
   * Maps to dispatch_product.id from legacy system
   * @format integer
   */
  legacy_product_id?: number;
  /**
   * Associated course/treatment type
   * @format public.course_type
   */
  course_type:
    | "main"
    | "refinement"
    | "any"
    | "replacement"
    | "invoice"
    | "merchandise";
  /**
   * Type of orthodontic product (brava, aligner, etc.)
   * @format text
   */
  product_type?: string;
  /** @format text */
  product_code?: string;
  /**
   * Whether this is a free product
   * @format boolean
   * @default false
   */
  is_free?: boolean;
  /**
   * Whether this is a substitute/replacement product
   * @format boolean
   * @default false
   */
  is_substitute?: boolean;
  /**
   * JSON configuration for product customization options
   * @format jsonb
   */
  customization?: any;
  /**
   * @format boolean
   * @default false
   */
  deleted?: boolean;
}

/** Digital assets and treatment plans */
export interface Projects {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_project.id from legacy system
   * @format integer
   */
  legacy_project_id?: number;
  /**
   * Maps to dispatch_plan.id from legacy system
   * @format integer
   */
  legacy_plan_id?: number;
  /** @format uuid */
  order_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  creator_id: string;
  /** @format text */
  name: string;
  /**
   * Type of digital asset (STL, photos, treatment plans, etc.)
   * @format public.project_type
   */
  project_type:
    | "treatment_plan"
    | "stl_upper"
    | "stl_lower"
    | "clinical_photo"
    | "xray"
    | "cbct_scan"
    | "simulation"
    | "aligner_design"
    | "document"
    | "other";
  /**
   * @format public.project_status
   * @default "draft"
   */
  status:
    | "draft"
    | "in_review"
    | "approved"
    | "in_progress"
    | "completed"
    | "archived"
    | "deleted";
  /**
   * Sequence number for treatment plans
   * @format integer
   */
  plan_number?: number;
  /**
   * Whether this is the original plan vs revision
   * @format boolean
   * @default false
   */
  is_original?: boolean;
  /** @format text */
  plan_notes?: string;
  /**
   * Original file UUID from legacy system
   * @format uuid
   */
  file_uid?: string;
  /** @format text */
  storage_path?: string;
  /** @format bigint */
  file_size_bytes?: number;
  /** @format text */
  mime_type?: string;
  /**
   * @format boolean
   * @default false
   */
  is_public?: boolean;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
  /** @format jsonb */
  metadata?: any;
}

/** Archived orders for historical reference and compliance */
export interface OrdersArchive {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   */
  id: string;
  /** @format integer */
  legacy_instruction_id?: number;
  /** @format text */
  order_number: string;
  /**
   * @format integer
   * @default 0
   */
  order_sequence?: number;
  /** @format uuid */
  patient_id: string;
  /** @format uuid */
  doctor_id: string;
  /** @format uuid */
  office_id: string;
  /** @format uuid */
  parent_order_id?: string;
  /** @format public.course_type */
  course_type:
    | "main"
    | "refinement"
    | "any"
    | "replacement"
    | "invoice"
    | "merchandise";
  /** @format text */
  course_name?: string;
  /** @format public.order_status */
  status:
    | "no_product"
    | "submitted"
    | "approved"
    | "in_production"
    | "shipped"
    | "add_plan"
    | "on_hold"
    | "cancelled";
  /** @format text */
  complaint?: string;
  /** @format text */
  objective?: string;
  /** @format text */
  conditions?: string;
  /** @format text */
  clinical_notes?: string;
  /** @format text */
  scanner_notes?: string;
  /**
   * @format boolean
   * @default false
   */
  comprehensive?: boolean;
  /**
   * @format boolean
   * @default false
   */
  cbct_required?: boolean;
  /**
   * @format boolean
   * @default false
   */
  accept_extraction?: boolean;
  /** @format uuid */
  upper_jaw_model_id?: string;
  /** @format uuid */
  lower_jaw_model_id?: string;
  /** @format numeric */
  price?: number;
  /** @format numeric */
  tax_amount?: number;
  /** @format numeric */
  discount_amount?: number;
  /** @format numeric */
  total_amount?: number;
  /** @format timestamp with time zone */
  submitted_at?: string;
  /** @format timestamp with time zone */
  approved_at?: string;
  /** @format timestamp with time zone */
  shipped_at?: string;
  /** @format timestamp with time zone */
  created_at?: string;
  /** @format timestamp with time zone */
  updated_at?: string;
  /**
   * When this order was moved to archive
   * @format timestamp with time zone
   * @default "now()"
   */
  archived_at?: string;
  /**
   * User who archived this order
   * @format uuid
   */
  archived_by?: string;
  /**
   * Reason for archiving
   * @format text
   */
  archive_reason?: string;
  /**
   * @format boolean
   * @default false
   */
  deleted?: boolean;
  /** @format timestamp with time zone */
  deleted_at?: string;
  /** @format jsonb */
  metadata?: any;
  /** @format jsonb */
  exports?: any;
}

/** Track which users have read which messages for notification management */
export interface MessageReadReceipts {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_reading.id from legacy system
   * @format integer
   */
  legacy_reading_id?: number;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  user_id: string;
  /**
   * Note:
   * This is a Foreign Key to `messages.id`.<fk table='messages' column='id'/>
   * @format uuid
   */
  message_id?: string;
  /** @format public.message_type */
  message_type:
    | "plan_comment"
    | "plan_note"
    | "doctor_message"
    | "patient_message"
    | "system_note"
    | "status_change"
    | "quality_note"
    | "shipping_note";
  /**
   * Legacy target ID for backward compatibility during migration
   * @format integer
   */
  target_id?: number;
  /**
   * When the message was read (NULL means unread)
   * @format timestamp with time zone
   */
  read_at?: string;
}

/** Product purchases and usage tracking */
export interface Purchases {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_purchase.id from legacy system
   * @format integer
   */
  legacy_purchase_id?: number;
  /** @format uuid */
  order_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `products.id`.<fk table='products' column='id'/>
   * @format uuid
   */
  product_id: string;
  /**
   * @format integer
   * @default 1
   */
  quantity?: number;
  /**
   * Quantity already used/consumed
   * @format integer
   * @default 0
   */
  used_quantity?: number;
  /**
   * Custom pricing for invoices
   * @format numeric
   */
  custom_price?: number;
  /** @format text */
  description?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  purchased_at?: string;
  /** @format jsonb */
  metadata?: any;
}

/** Patient appointments, milestones, and important events */
export interface PatientEvents {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_event.id from legacy system
   * @format integer
   */
  legacy_event_id?: number;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  patient_id: string;
  /**
   * Event description or appointment type
   * @format text
   */
  title: string;
  /**
   * Scheduled date for the event
   * @format date
   */
  event_date: string;
  /**
   * @format boolean
   * @default false
   */
  is_completed?: boolean;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /** @format timestamp with time zone */
  completed_at?: string;
  /** @format jsonb */
  metadata?: any;
}

export interface FullOrdersMigrationLog {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format integer
   */
  id: number;
  /** @format integer */
  batch_number?: number;
  /** @format integer */
  start_legacy_id?: number;
  /** @format integer */
  end_legacy_id?: number;
  /** @format integer */
  processed_count?: number;
  /** @format integer */
  successful_count?: number;
  /** @format integer */
  failed_count?: number;
  /** @format integer */
  missing_mappings?: number;
  /** @format text */
  error_details?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  started_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  completed_at?: string;
  /**
   * @format text
   * @default "completed"
   */
  status?: string;
}

/** Links between internal entities and external system references (replaces generic ContentTypes) */
export interface ExternalLinks {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_link.id from legacy system
   * @format integer
   */
  legacy_link_id?: number;
  /**
   * Type of entity being linked (office, patient, order, etc.)
   * @format text
   */
  entity_type: string;
  /**
   * UUID of the internal entity being linked
   * @format uuid
   */
  entity_id: string;
  /**
   * ID in the external system
   * @format text
   */
  external_id: string;
  /**
   * Name of external system (netsuite, square, etc.)
   * @format text
   */
  external_system?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /** @format timestamp with time zone */
  modified_at?: string;
  /** @format jsonb */
  metadata?: any;
}

/** Orthodontic jaw specifications */
export interface Jaws {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_jaw.id from legacy system
   * @format integer
   */
  legacy_jaw_id?: number;
  /** @format uuid */
  order_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `products.id`.<fk table='products' column='id'/>
   * @format uuid
   */
  product_id?: string;
  /** @format text */
  jaw_type: string;
  /**
   * @format boolean
   * @default false
   */
  labial?: boolean;
  /**
   * Teeth to bond (bit string representation)
   * @format text
   * @default "'0000000000000000'::character varying"
   */
  bond_teeth?: string;
  /**
   * Teeth to extract (bit string representation)
   * @format text
   * @default "'0000000000000000'::character varying"
   */
  extract_teeth?: string;
  /** @format text */
  replacement_reason?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
  /** @format jsonb */
  metadata?: any;
}

export interface MigrationStatus {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format integer
   */
  id: number;
  /** @format text */
  current_step?: string;
  /** @format integer */
  progress_percentage?: number;
  /** @format text */
  details?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
}

/** File management for orders and projects */
export interface Files {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_file.id from legacy system
   * @format integer
   */
  legacy_file_id?: number;
  /**
   * Unique file identifier used in URLs
   * @format uuid
   * @default "gen_random_uuid()"
   */
  file_uid: string;
  /** @format text */
  original_name: string;
  /** @format text */
  extension?: string;
  /** @format uuid */
  order_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `projects.id`.<fk table='projects' column='id'/>
   * @format uuid
   */
  project_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  uploaded_by?: string;
  /**
   * Type of file (STL, photo, x-ray, etc.)
   * @format public.project_type
   */
  file_type?:
    | "treatment_plan"
    | "stl_upper"
    | "stl_lower"
    | "clinical_photo"
    | "xray"
    | "cbct_scan"
    | "simulation"
    | "aligner_design"
    | "document"
    | "other";
  /** @format text */
  mime_type?: string;
  /** @format bigint */
  size_bytes?: number;
  /** @format text */
  storage_path: string;
  /**
   * @format text
   * @default "s3"
   */
  storage_provider?: string;
  /**
   * @format text
   * @default "uploaded"
   */
  status?: string;
  /** @format timestamp with time zone */
  processed_at?: string;
  /**
   * Image dimensions, EXIF data, etc.
   * @format jsonb
   */
  image_metadata?: any;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  uploaded_at?: string;
  /** @format jsonb */
  metadata?: any;
  /** @format text */
  filename?: string;
  /** @format bigint */
  file_size_bytes?: number;
  /** @format text */
  checksum?: string;
}

/** Active and historical computational processing jobs */
export interface ComputationalInstances {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_instance.id from legacy system
   * @format integer
   */
  legacy_instance_id?: number;
  /**
   * Note:
   * This is a Foreign Key to `projects.id`.<fk table='projects' column='id'/>
   * @format uuid
   */
  project_id: string;
  /**
   * Note:
   * This is a Foreign Key to `computational_agents.id`.<fk table='computational_agents' column='id'/>
   * @format uuid
   */
  agent_id?: string;
  /**
   * User who initiated this computation
   *
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  opener_id?: string;
  /**
   * @format integer
   * @default 0
   */
  port?: number;
  /**
   * Type of computational process
   * @format text
   */
  instance_type?: string;
  /**
   * Position in processing queue
   * @format integer
   * @default 0
   */
  queue_position?: number;
  /** @format jsonb */
  parameters?: any;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  started_at?: string;
  /** @format timestamp with time zone */
  completed_at?: string;
  /** @format jsonb */
  metadata?: any;
}

/** All communications replacing legacy ContentTypes dispatch_record */
export interface Messages {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_record.id from legacy system
   * @format integer
   */
  legacy_record_id?: number;
  /**
   * Type of message for categorization and routing
   * @format public.message_type
   */
  message_type:
    | "plan_comment"
    | "plan_note"
    | "doctor_message"
    | "patient_message"
    | "system_note"
    | "status_change"
    | "quality_note"
    | "shipping_note";
  /** @format uuid */
  order_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `projects.id`.<fk table='projects' column='id'/>
   * @format uuid
   */
  project_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `tasks.id`.<fk table='tasks' column='id'/>
   * @format uuid
   */
  task_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  patient_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  sender_id?: string;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  recipient_id?: string;
  /** @format text */
  subject?: string;
  /** @format text */
  body: string;
  /**
   * Whether message is visible to all parties or private
   * @format boolean
   * @default true
   */
  is_public?: boolean;
  /**
   * @format boolean
   * @default false
   */
  is_read?: boolean;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /** @format timestamp with time zone */
  read_at?: string;
  /**
   * Note:
   * This is a Foreign Key to `messages.id`.<fk table='messages' column='id'/>
   * @format uuid
   */
  parent_message_id?: string;
  /**
   * Groups related messages together
   * @format uuid
   */
  thread_id?: string;
  /** @format jsonb */
  metadata?: any;
}

/** Discount rules and promotions for pricing offers */
export interface Discounts {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_discount.id from legacy system
   * @format integer
   */
  legacy_discount_id?: number;
  /**
   * Note:
   * This is a Foreign Key to `offers.id`.<fk table='offers' column='id'/>
   * @format uuid
   */
  offer_id: string;
  /**
   * Discount percentage (0-100)
   * @format integer
   */
  percent: number;
  /** @format text */
  reason?: string;
  /**
   * Maximum number of times this discount can be used
   * @format integer
   */
  max_count?: number;
  /**
   * @format integer
   * @default 0
   */
  used_count?: number;
  /** @format date */
  start_date?: string;
  /** @format date */
  end_date?: string;
  /**
   * Whether discount applies to total period or per instance
   * @format boolean
   * @default false
   */
  is_total?: boolean;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
}

export interface OrdersBackupOld {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /** @format uuid */
  case_id: string;
  /** @format uuid */
  practice_id: string;
  /** @format text */
  order_number: string;
  /**
   * @format numeric
   * @default 0
   */
  subtotal: number;
  /**
   * @format numeric
   * @default 0
   */
  tax_amount: number;
  /**
   * @format numeric
   * @default 0
   */
  total_amount: number;
  /**
   * @format text
   * @default "USD"
   */
  currency: string;
  /** @format text */
  notes?: string;
  /** @format jsonb */
  metadata?: any;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
}

export interface ProjectsMigrationLog {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format integer
   */
  id: number;
  /** @format integer */
  batch_number?: number;
  /** @format integer */
  start_legacy_id?: number;
  /** @format integer */
  end_legacy_id?: number;
  /** @format integer */
  processed_count?: number;
  /** @format integer */
  successful_count?: number;
  /** @format integer */
  failed_count?: number;
  /** @format integer */
  missing_creators?: number;
  /** @format text */
  error_details?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  started_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  completed_at?: string;
  /**
   * @format text
   * @default "completed"
   */
  status?: string;
}

/** Hierarchical task categories for organizing templates and workflows */
export interface Categories {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_category.id from legacy system
   * @format integer
   */
  legacy_category_id?: number;
  /** @format text */
  name: string;
  /**
   * Self-reference for hierarchical categories
   *
   * Note:
   * This is a Foreign Key to `categories.id`.<fk table='categories' column='id'/>
   * @format uuid
   */
  parent_id?: string;
  /**
   * @format integer
   * @default 0
   */
  display_order?: number;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  updated_at?: string;
}

export interface VMigrationStatus {
  /** @format text */
  entity?: string;
  /** @format bigint */
  total_count?: number;
  /** @format bigint */
  with_legacy_id?: number;
  /** @format bigint */
  new_records?: number;
}

export interface VOrderSummary {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   */
  id?: string;
  /** @format text */
  order_number?: string;
  /** @format text */
  patient_name?: string;
  /** @format text */
  doctor_name?: string;
  /** @format text */
  office_name?: string;
  /** @format public.order_status */
  status?:
    | "no_product"
    | "submitted"
    | "approved"
    | "in_production"
    | "shipped"
    | "add_plan"
    | "on_hold"
    | "cancelled";
  /** @format public.course_type */
  course_type?:
    | "main"
    | "refinement"
    | "any"
    | "replacement"
    | "invoice"
    | "merchandise";
  /** @format numeric */
  amount?: number;
  /** @format timestamp with time zone */
  submitted_at?: string;
  /** @format timestamp with time zone */
  shipped_at?: string;
  /** @format timestamp with time zone */
  created_at?: string;
}

/** User notifications for various system events and updates */
export interface Notifications {
  /**
   * Note:
   * This is a Primary Key.<pk/>
   * @format uuid
   * @default "gen_random_uuid()"
   */
  id: string;
  /**
   * Maps to dispatch_notification.id from legacy system
   * @format integer
   */
  legacy_notification_id?: number;
  /**
   * Note:
   * This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
   * @format uuid
   */
  recipient_id: string;
  /** @format text */
  sender?: string;
  /**
   * Name of notification template used
   * @format text
   */
  template_name?: string;
  /**
   * JSON context data for rendering the notification
   * @format jsonb
   */
  template_context?: any;
  /**
   * @format boolean
   * @default false
   */
  is_read?: boolean;
  /**
   * @format boolean
   * @default true
   */
  should_send_email?: boolean;
  /** @format boolean */
  email_sent?: boolean;
  /**
   * Type of entity this notification relates to
   * @format text
   */
  entity_type?: string;
  /** @format uuid */
  entity_id?: string;
  /**
   * @format timestamp with time zone
   * @default "now()"
   */
  created_at?: string;
  /** @format timestamp with time zone */
  read_at?: string;
  /** @format timestamp with time zone */
  sent_at?: string;
}
