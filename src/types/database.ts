export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_data: Json | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          previous_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_data?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          previous_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_data?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          previous_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      brackets: {
        Row: {
          active: boolean | null
          angulation: number | null
          arch_type: string | null
          base_shape: string | null
          bracket_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          height_mm: number | null
          id: string
          legacy_bracket_id: number | null
          legacy_project_id: number | null
          manufacturer: string | null
          material: string | null
          metadata: Json | null
          model_number: string | null
          name: string
          prescription: string | null
          sku: string | null
          slot_size: number | null
          thickness_mm: number | null
          tooth_position: string | null
          torque: number | null
          unit_cost: number | null
          updated_at: string | null
          width_mm: number | null
        }
        Insert: {
          active?: boolean | null
          angulation?: number | null
          arch_type?: string | null
          base_shape?: string | null
          bracket_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          height_mm?: number | null
          id?: string
          legacy_bracket_id?: number | null
          legacy_project_id?: number | null
          manufacturer?: string | null
          material?: string | null
          metadata?: Json | null
          model_number?: string | null
          name: string
          prescription?: string | null
          sku?: string | null
          slot_size?: number | null
          thickness_mm?: number | null
          tooth_position?: string | null
          torque?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          width_mm?: number | null
        }
        Update: {
          active?: boolean | null
          angulation?: number | null
          arch_type?: string | null
          base_shape?: string | null
          bracket_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          height_mm?: number | null
          id?: string
          legacy_bracket_id?: number | null
          legacy_project_id?: number | null
          manufacturer?: string | null
          material?: string | null
          metadata?: Json | null
          model_number?: string | null
          name?: string
          prescription?: string | null
          sku?: string | null
          slot_size?: number | null
          thickness_mm?: number | null
          tooth_position?: string | null
          torque?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          width_mm?: number | null
        }
        Relationships: []
      }
      case_files: {
        Row: {
          case_id: string
          created_at: string | null
          created_by: string | null
          display_order: number | null
          file_id: string
          file_purpose: string | null
          id: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          case_id: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          file_id: string
          file_purpose?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          file_id?: string
          file_purpose?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_files_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      case_messages: {
        Row: {
          attachment_ids: Json | null
          case_id: string
          content: string
          deleted: boolean | null
          deleted_at: string | null
          delivery_status: string | null
          id: string
          is_confidential: boolean | null
          is_urgent: boolean | null
          legacy_message_id: number | null
          legacy_record_id: number | null
          message_type: Database["public"]["Enums"]["case_message_type"]
          metadata: Json | null
          parent_message_id: string | null
          priority: number | null
          read_at: string | null
          recipient_id: string | null
          related_tooth_numbers: Json | null
          requires_response: boolean | null
          responded_at: string | null
          scheduled_at: string | null
          sender_id: string | null
          sent_at: string | null
          subject: string | null
          tags: Json | null
          thread_root_id: string | null
          treatment_phase: string | null
        }
        Insert: {
          attachment_ids?: Json | null
          case_id: string
          content: string
          deleted?: boolean | null
          deleted_at?: string | null
          delivery_status?: string | null
          id?: string
          is_confidential?: boolean | null
          is_urgent?: boolean | null
          legacy_message_id?: number | null
          legacy_record_id?: number | null
          message_type: Database["public"]["Enums"]["case_message_type"]
          metadata?: Json | null
          parent_message_id?: string | null
          priority?: number | null
          read_at?: string | null
          recipient_id?: string | null
          related_tooth_numbers?: Json | null
          requires_response?: boolean | null
          responded_at?: string | null
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          subject?: string | null
          tags?: Json | null
          thread_root_id?: string | null
          treatment_phase?: string | null
        }
        Update: {
          attachment_ids?: Json | null
          case_id?: string
          content?: string
          deleted?: boolean | null
          deleted_at?: string | null
          delivery_status?: string | null
          id?: string
          is_confidential?: boolean | null
          is_urgent?: boolean | null
          legacy_message_id?: number | null
          legacy_record_id?: number | null
          message_type?: Database["public"]["Enums"]["case_message_type"]
          metadata?: Json | null
          parent_message_id?: string | null
          priority?: number | null
          read_at?: string | null
          recipient_id?: string | null
          related_tooth_numbers?: Json | null
          requires_response?: boolean | null
          responded_at?: string | null
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          subject?: string | null
          tags?: Json | null
          thread_root_id?: string | null
          treatment_phase?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "case_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_messages_thread_root_id_fkey"
            columns: ["thread_root_id"]
            isOneToOne: false
            referencedRelation: "case_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      case_states: {
        Row: {
          automated: boolean | null
          case_id: string
          changed_at: string | null
          changed_by_id: string | null
          current_state: Database["public"]["Enums"]["case_state_type"]
          id: string
          legacy_state_id: number | null
          metadata: Json | null
          notes: string | null
          previous_state: Database["public"]["Enums"]["case_state_type"] | null
          reason: string | null
        }
        Insert: {
          automated?: boolean | null
          case_id: string
          changed_at?: string | null
          changed_by_id?: string | null
          current_state: Database["public"]["Enums"]["case_state_type"]
          id?: string
          legacy_state_id?: number | null
          metadata?: Json | null
          notes?: string | null
          previous_state?: Database["public"]["Enums"]["case_state_type"] | null
          reason?: string | null
        }
        Update: {
          automated?: boolean | null
          case_id?: string
          changed_at?: string | null
          changed_by_id?: string | null
          current_state?: Database["public"]["Enums"]["case_state_type"]
          id?: string
          legacy_state_id?: number | null
          metadata?: Json | null
          notes?: string | null
          previous_state?: Database["public"]["Enums"]["case_state_type"] | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_states_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          actual_duration_months: number | null
          bite_correction_method: string | null
          case_name: string | null
          case_number: string
          cbct_available: boolean | null
          chief_complaint: string | null
          clinical_conditions: string | null
          clinical_notes: string | null
          complexity: Database["public"]["Enums"]["case_complexity_type"] | null
          consultation_date: string | null
          created_at: string | null
          deleted: boolean | null
          deleted_at: string | null
          diagnosis_date: string | null
          estimated_duration_months: number | null
          extraction_compromise: boolean | null
          id: string
          impressions_available: boolean | null
          is_comprehensive: boolean | null
          legacy_instruction_id: number | null
          legacy_patient_id: number | null
          lower_teeth_treated: number | null
          malocclusion_category: string | null
          metadata: Json | null
          office_id: string | null
          patient_id: string
          photos_available: boolean | null
          primary_doctor_id: string
          status: Database["public"]["Enums"]["case_status_type"] | null
          treatment_end_date: string | null
          treatment_notes: string | null
          treatment_objective: string | null
          treatment_start_date: string | null
          updated_at: string | null
          upper_teeth_treated: number | null
        }
        Insert: {
          actual_duration_months?: number | null
          bite_correction_method?: string | null
          case_name?: string | null
          case_number: string
          cbct_available?: boolean | null
          chief_complaint?: string | null
          clinical_conditions?: string | null
          clinical_notes?: string | null
          complexity?:
            | Database["public"]["Enums"]["case_complexity_type"]
            | null
          consultation_date?: string | null
          created_at?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          diagnosis_date?: string | null
          estimated_duration_months?: number | null
          extraction_compromise?: boolean | null
          id?: string
          impressions_available?: boolean | null
          is_comprehensive?: boolean | null
          legacy_instruction_id?: number | null
          legacy_patient_id?: number | null
          lower_teeth_treated?: number | null
          malocclusion_category?: string | null
          metadata?: Json | null
          office_id?: string | null
          patient_id: string
          photos_available?: boolean | null
          primary_doctor_id: string
          status?: Database["public"]["Enums"]["case_status_type"] | null
          treatment_end_date?: string | null
          treatment_notes?: string | null
          treatment_objective?: string | null
          treatment_start_date?: string | null
          updated_at?: string | null
          upper_teeth_treated?: number | null
        }
        Update: {
          actual_duration_months?: number | null
          bite_correction_method?: string | null
          case_name?: string | null
          case_number?: string
          cbct_available?: boolean | null
          chief_complaint?: string | null
          clinical_conditions?: string | null
          clinical_notes?: string | null
          complexity?:
            | Database["public"]["Enums"]["case_complexity_type"]
            | null
          consultation_date?: string | null
          created_at?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          diagnosis_date?: string | null
          estimated_duration_months?: number | null
          extraction_compromise?: boolean | null
          id?: string
          impressions_available?: boolean | null
          is_comprehensive?: boolean | null
          legacy_instruction_id?: number | null
          legacy_patient_id?: number | null
          lower_teeth_treated?: number | null
          malocclusion_category?: string | null
          metadata?: Json | null
          office_id?: string | null
          patient_id?: string
          photos_available?: boolean | null
          primary_doctor_id?: string
          status?: Database["public"]["Enums"]["case_status_type"] | null
          treatment_end_date?: string | null
          treatment_notes?: string | null
          treatment_objective?: string | null
          treatment_start_date?: string | null
          updated_at?: string | null
          upper_teeth_treated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_primary_doctor_id_fkey"
            columns: ["primary_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          legacy_category_id: number | null
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          legacy_category_id?: number | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          legacy_category_id?: number | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          comment_type: Database["public"]["Enums"]["comment_type_enum"]
          content: string
          created_at: string | null
          id: string
          legacy_id: number | null
          legacy_table: string | null
          parent_comment_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          comment_type: Database["public"]["Enums"]["comment_type_enum"]
          content: string
          created_at?: string | null
          id?: string
          legacy_id?: number | null
          legacy_table?: string | null
          parent_comment_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          comment_type?: Database["public"]["Enums"]["comment_type_enum"]
          content?: string
          created_at?: string | null
          id?: string
          legacy_id?: number | null
          legacy_table?: string | null
          parent_comment_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          course_type: number | null
          created_at: string | null
          customization: Json | null
          id: string
          legacy_id: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          course_type?: number | null
          created_at?: string | null
          customization?: Json | null
          id?: string
          legacy_id?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          course_type?: number | null
          created_at?: string | null
          customization?: Json | null
          id?: string
          legacy_id?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_feedback: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_satisfied: boolean | null
          description: string
          discount_amount: number | null
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          followup_completed: boolean | null
          followup_date: string | null
          id: string
          legacy_record_id: number | null
          regarding_order_id: string | null
          regarding_patient_id: string | null
          regarding_staff_id: string | null
          requires_followup: boolean | null
          resolution_notes: string | null
          resolved_at: string | null
          response_time_hours: number | null
          resulted_in_discount: boolean | null
          resulted_in_remake: boolean | null
          severity: Database["public"]["Enums"]["severity"] | null
          source_id: string | null
          source_organization_id: string | null
          source_type: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_satisfied?: boolean | null
          description: string
          discount_amount?: number | null
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          followup_completed?: boolean | null
          followup_date?: string | null
          id?: string
          legacy_record_id?: number | null
          regarding_order_id?: string | null
          regarding_patient_id?: string | null
          regarding_staff_id?: string | null
          requires_followup?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          response_time_hours?: number | null
          resulted_in_discount?: boolean | null
          resulted_in_remake?: boolean | null
          severity?: Database["public"]["Enums"]["severity"] | null
          source_id?: string | null
          source_organization_id?: string | null
          source_type: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_satisfied?: boolean | null
          description?: string
          discount_amount?: number | null
          feedback_type?: Database["public"]["Enums"]["feedback_type"]
          followup_completed?: boolean | null
          followup_date?: string | null
          id?: string
          legacy_record_id?: number | null
          regarding_order_id?: string | null
          regarding_patient_id?: string | null
          regarding_staff_id?: string | null
          requires_followup?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          response_time_hours?: number | null
          resulted_in_discount?: boolean | null
          resulted_in_remake?: boolean | null
          severity?: Database["public"]["Enums"]["severity"] | null
          source_id?: string | null
          source_organization_id?: string | null
          source_type?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_feedback_regarding_order_id_fkey"
            columns: ["regarding_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedback_source_organization_id_fkey"
            columns: ["source_organization_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          code: string | null
          created_at: string | null
          current_uses: number | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          fixed_amount: number | null
          id: string
          is_active: boolean | null
          legacy_discount_id: number | null
          max_uses: number | null
          metadata: Json | null
          minimum_order_amount: number | null
          name: string
          percentage: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          current_uses?: number | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          legacy_discount_id?: number | null
          max_uses?: number | null
          metadata?: Json | null
          minimum_order_amount?: number | null
          name: string
          percentage?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          current_uses?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          legacy_discount_id?: number | null
          max_uses?: number | null
          metadata?: Json | null
          minimum_order_amount?: number | null
          name?: string
          percentage?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      doctor_notes: {
        Row: {
          author_id: string | null
          comment_id: string | null
          created_at: string | null
          doctor_id: string
          id: string
          legacy_note_id: number | null
          metadata: Json | null
          text: string | null
        }
        Insert: {
          author_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          doctor_id: string
          id?: string
          legacy_note_id?: number | null
          metadata?: Json | null
          text?: string | null
        }
        Update: {
          author_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          doctor_id?: string
          id?: string
          legacy_note_id?: number | null
          metadata?: Json | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_notes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_offices: {
        Row: {
          created_at: string | null
          doctor_id: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          office_id: string
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          office_id: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          office_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          accepts_insurance: boolean | null
          bio: string | null
          board_certifications: Json | null
          consultation_duration_minutes: number | null
          consultation_fee: number | null
          doctor_number: string | null
          education: Json | null
          follow_up_duration_minutes: number | null
          id: string
          is_accepting_patients: boolean | null
          joined_practice_at: string | null
          languages_spoken: Json | null
          legacy_doctor_id: number | null
          legacy_user_id: number | null
          license_number: string | null
          licensed_since: string | null
          max_patient_load: number | null
          npi_number: string | null
          payment_terms: Json | null
          practice_type: string | null
          primary_office_id: string | null
          professional_memberships: Json | null
          profile_id: string
          specialties: Json | null
          specialty: string | null
          status: Database["public"]["Enums"]["doctor_status_type"] | null
          updated_at: string | null
          working_hours: Json | null
          years_experience: number | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          bio?: string | null
          board_certifications?: Json | null
          consultation_duration_minutes?: number | null
          consultation_fee?: number | null
          doctor_number?: string | null
          education?: Json | null
          follow_up_duration_minutes?: number | null
          id?: string
          is_accepting_patients?: boolean | null
          joined_practice_at?: string | null
          languages_spoken?: Json | null
          legacy_doctor_id?: number | null
          legacy_user_id?: number | null
          license_number?: string | null
          licensed_since?: string | null
          max_patient_load?: number | null
          npi_number?: string | null
          payment_terms?: Json | null
          practice_type?: string | null
          primary_office_id?: string | null
          professional_memberships?: Json | null
          profile_id: string
          specialties?: Json | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["doctor_status_type"] | null
          updated_at?: string | null
          working_hours?: Json | null
          years_experience?: number | null
        }
        Update: {
          accepts_insurance?: boolean | null
          bio?: string | null
          board_certifications?: Json | null
          consultation_duration_minutes?: number | null
          consultation_fee?: number | null
          doctor_number?: string | null
          education?: Json | null
          follow_up_duration_minutes?: number | null
          id?: string
          is_accepting_patients?: boolean | null
          joined_practice_at?: string | null
          languages_spoken?: Json | null
          legacy_doctor_id?: number | null
          legacy_user_id?: number | null
          license_number?: string | null
          licensed_since?: string | null
          max_patient_load?: number | null
          npi_number?: string | null
          payment_terms?: Json | null
          practice_type?: string | null
          primary_office_id?: string | null
          professional_memberships?: Json | null
          profile_id?: string
          specialties?: Json | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["doctor_status_type"] | null
          updated_at?: string | null
          working_hours?: Json | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_primary_office_id_fkey"
            columns: ["primary_office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      external_links: {
        Row: {
          created_at: string | null
          external_id: string
          id: string
          internal_entity_id: string
          internal_entity_type: string
          is_active: boolean | null
          legacy_link_id: number | null
          link_type: string
          metadata: Json | null
          system_name: string
        }
        Insert: {
          created_at?: string | null
          external_id: string
          id?: string
          internal_entity_id: string
          internal_entity_type: string
          is_active?: boolean | null
          legacy_link_id?: number | null
          link_type: string
          metadata?: Json | null
          system_name: string
        }
        Update: {
          created_at?: string | null
          external_id?: string
          id?: string
          internal_entity_id?: string
          internal_entity_type?: string
          is_active?: boolean | null
          legacy_link_id?: number | null
          link_type?: string
          metadata?: Json | null
          system_name?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          checksum: string | null
          file_size_bytes: number | null
          file_type: string | null
          file_uid: string
          filename: string
          id: string
          legacy_file_id: number | null
          metadata: Json | null
          mime_type: string | null
          order_id: string | null
          storage_path: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          checksum?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_uid: string
          filename: string
          id?: string
          legacy_file_id?: number | null
          metadata?: Json | null
          mime_type?: string | null
          order_id?: string | null
          storage_path?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          checksum?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_uid?: string
          filename?: string
          id?: string
          legacy_file_id?: number | null
          metadata?: Json | null
          mime_type?: string | null
          order_id?: string | null
          storage_path?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      files_temp: {
        Row: {
          checksum: string | null
          created_at: string | null
          file_size_bytes: number | null
          file_type: string
          file_uid: string
          filename: string
          id: string
          legacy_file_id: number | null
          metadata: Json | null
          mime_type: string | null
          order_id: string | null
          storage_path: string
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          file_type: string
          file_uid?: string
          filename: string
          id?: string
          legacy_file_id?: number | null
          metadata?: Json | null
          mime_type?: string | null
          order_id?: string | null
          storage_path: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          checksum?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          file_type?: string
          file_uid?: string
          filename?: string
          id?: string
          legacy_file_id?: number | null
          metadata?: Json | null
          mime_type?: string | null
          order_id?: string | null
          storage_path?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_temp_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      jaws: {
        Row: {
          bond_teeth: string | null
          created_at: string | null
          extract_teeth: string | null
          id: string
          jaw_type: string
          labial: boolean | null
          legacy_jaw_id: number | null
          metadata: Json | null
          order_id: string | null
          product_id: string | null
          replacement_reason: string | null
          updated_at: string | null
        }
        Insert: {
          bond_teeth?: string | null
          created_at?: string | null
          extract_teeth?: string | null
          id?: string
          jaw_type: string
          labial?: boolean | null
          legacy_jaw_id?: number | null
          metadata?: Json | null
          order_id?: string | null
          product_id?: string | null
          replacement_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          bond_teeth?: string | null
          created_at?: string | null
          extract_teeth?: string | null
          id?: string
          jaw_type?: string
          labial?: boolean | null
          legacy_jaw_id?: number | null
          metadata?: Json | null
          order_id?: string | null
          product_id?: string | null
          replacement_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jaws_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jaws_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      mastra_evals: {
        Row: {
          agent_name: string
          created_at: string
          created_atZ: string | null
          createdAt: string | null
          createdAtZ: string | null
          global_run_id: string
          input: string
          instructions: string
          metric_name: string
          output: string
          result: Json
          run_id: string
          test_info: Json | null
        }
        Insert: {
          agent_name: string
          created_at: string
          created_atZ?: string | null
          createdAt?: string | null
          createdAtZ?: string | null
          global_run_id: string
          input: string
          instructions: string
          metric_name: string
          output: string
          result: Json
          run_id: string
          test_info?: Json | null
        }
        Update: {
          agent_name?: string
          created_at?: string
          created_atZ?: string | null
          createdAt?: string | null
          createdAtZ?: string | null
          global_run_id?: string
          input?: string
          instructions?: string
          metric_name?: string
          output?: string
          result?: Json
          run_id?: string
          test_info?: Json | null
        }
        Relationships: []
      }
      mastra_messages: {
        Row: {
          content: string
          createdAt: string
          createdAtZ: string | null
          id: string
          resourceId: string | null
          role: string
          thread_id: string
          type: string
        }
        Insert: {
          content: string
          createdAt: string
          createdAtZ?: string | null
          id: string
          resourceId?: string | null
          role: string
          thread_id: string
          type: string
        }
        Update: {
          content?: string
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          resourceId?: string | null
          role?: string
          thread_id?: string
          type?: string
        }
        Relationships: []
      }
      mastra_resources: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: Json | null
          updatedAt: string
          updatedAtZ: string | null
          workingMemory: string | null
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: Json | null
          updatedAt: string
          updatedAtZ?: string | null
          workingMemory?: string | null
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: Json | null
          updatedAt?: string
          updatedAtZ?: string | null
          workingMemory?: string | null
        }
        Relationships: []
      }
      mastra_scorers: {
        Row: {
          additionalContext: Json | null
          analyzePrompt: string | null
          analyzeStepResult: Json | null
          createdAt: string
          createdAtZ: string | null
          entity: Json | null
          entityId: string | null
          entityType: string | null
          extractPrompt: string | null
          extractStepResult: Json | null
          generateReasonPrompt: string | null
          generateScorePrompt: string | null
          id: string
          input: Json
          metadata: Json | null
          output: Json
          preprocessPrompt: string | null
          preprocessStepResult: Json | null
          reason: string | null
          reasonPrompt: string | null
          resourceId: string | null
          runId: string
          runtimeContext: Json | null
          score: number
          scorer: Json
          scorerId: string
          source: string
          threadId: string | null
          traceId: string | null
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          additionalContext?: Json | null
          analyzePrompt?: string | null
          analyzeStepResult?: Json | null
          createdAt: string
          createdAtZ?: string | null
          entity?: Json | null
          entityId?: string | null
          entityType?: string | null
          extractPrompt?: string | null
          extractStepResult?: Json | null
          generateReasonPrompt?: string | null
          generateScorePrompt?: string | null
          id: string
          input: Json
          metadata?: Json | null
          output: Json
          preprocessPrompt?: string | null
          preprocessStepResult?: Json | null
          reason?: string | null
          reasonPrompt?: string | null
          resourceId?: string | null
          runId: string
          runtimeContext?: Json | null
          score: number
          scorer: Json
          scorerId: string
          source: string
          threadId?: string | null
          traceId?: string | null
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          additionalContext?: Json | null
          analyzePrompt?: string | null
          analyzeStepResult?: Json | null
          createdAt?: string
          createdAtZ?: string | null
          entity?: Json | null
          entityId?: string | null
          entityType?: string | null
          extractPrompt?: string | null
          extractStepResult?: Json | null
          generateReasonPrompt?: string | null
          generateScorePrompt?: string | null
          id?: string
          input?: Json
          metadata?: Json | null
          output?: Json
          preprocessPrompt?: string | null
          preprocessStepResult?: Json | null
          reason?: string | null
          reasonPrompt?: string | null
          resourceId?: string | null
          runId?: string
          runtimeContext?: Json | null
          score?: number
          scorer?: Json
          scorerId?: string
          source?: string
          threadId?: string | null
          traceId?: string | null
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_threads: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          id: string
          metadata: string | null
          resourceId: string
          title: string
          updatedAt: string
          updatedAtZ: string | null
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          id: string
          metadata?: string | null
          resourceId: string
          title: string
          updatedAt: string
          updatedAtZ?: string | null
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          id?: string
          metadata?: string | null
          resourceId?: string
          title?: string
          updatedAt?: string
          updatedAtZ?: string | null
        }
        Relationships: []
      }
      mastra_traces: {
        Row: {
          attributes: Json | null
          createdAt: string
          createdAtZ: string | null
          endTime: number
          events: Json | null
          id: string
          kind: number
          links: Json | null
          name: string
          other: string | null
          parentSpanId: string | null
          scope: string
          startTime: number
          status: Json | null
          traceId: string
        }
        Insert: {
          attributes?: Json | null
          createdAt: string
          createdAtZ?: string | null
          endTime: number
          events?: Json | null
          id: string
          kind: number
          links?: Json | null
          name: string
          other?: string | null
          parentSpanId?: string | null
          scope: string
          startTime: number
          status?: Json | null
          traceId: string
        }
        Update: {
          attributes?: Json | null
          createdAt?: string
          createdAtZ?: string | null
          endTime?: number
          events?: Json | null
          id?: string
          kind?: number
          links?: Json | null
          name?: string
          other?: string | null
          parentSpanId?: string | null
          scope?: string
          startTime?: number
          status?: Json | null
          traceId?: string
        }
        Relationships: []
      }
      mastra_workflow_snapshot: {
        Row: {
          createdAt: string
          createdAtZ: string | null
          resourceId: string | null
          run_id: string
          snapshot: string
          updatedAt: string
          updatedAtZ: string | null
          workflow_name: string
        }
        Insert: {
          createdAt: string
          createdAtZ?: string | null
          resourceId?: string | null
          run_id: string
          snapshot: string
          updatedAt: string
          updatedAtZ?: string | null
          workflow_name: string
        }
        Update: {
          createdAt?: string
          createdAtZ?: string | null
          resourceId?: string | null
          run_id?: string
          snapshot?: string
          updatedAt?: string
          updatedAtZ?: string | null
          workflow_name?: string
        }
        Relationships: []
      }
      memory_messages_1024: {
        Row: {
          embedding: string | null
          id: number
          metadata: Json | null
          vector_id: string
        }
        Insert: {
          embedding?: string | null
          id?: number
          metadata?: Json | null
          vector_id: string
        }
        Update: {
          embedding?: string | null
          id?: number
          metadata?: Json | null
          vector_id?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          attachment_type: string | null
          created_at: string | null
          file_id: string
          id: string
          legacy_attachment_id: number | null
          legacy_file_id: number | null
          legacy_record_id: number | null
          message_id: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          attachment_type?: string | null
          created_at?: string | null
          file_id: string
          id?: string
          legacy_attachment_id?: number | null
          legacy_file_id?: number | null
          legacy_record_id?: number | null
          message_id: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          attachment_type?: string | null
          created_at?: string | null
          file_id?: string
          id?: string
          legacy_attachment_id?: number | null
          legacy_file_id?: number | null
          legacy_record_id?: number | null
          message_id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          legacy_record_id: number | null
          message_type: string
          metadata: Json | null
          recipient_id: string | null
          recipient_type: string
          sender_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          legacy_record_id?: number | null
          message_type?: string
          metadata?: Json | null
          recipient_id?: string | null
          recipient_type: string
          sender_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          legacy_record_id?: number | null
          message_type?: string
          metadata?: Json | null
          recipient_id?: string | null
          recipient_type?: string
          sender_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migration_control: {
        Row: {
          batch_size: number | null
          completed_at: string | null
          error_message: string | null
          id: number
          operation: string | null
          phase: string | null
          records_processed: number | null
          source_query: string | null
          started_at: string | null
          status: string | null
          table_name: string | null
          total_records: number | null
          validation_query: string | null
          worker_id: number | null
        }
        Insert: {
          batch_size?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: number
          operation?: string | null
          phase?: string | null
          records_processed?: number | null
          source_query?: string | null
          started_at?: string | null
          status?: string | null
          table_name?: string | null
          total_records?: number | null
          validation_query?: string | null
          worker_id?: number | null
        }
        Update: {
          batch_size?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: number
          operation?: string | null
          phase?: string | null
          records_processed?: number | null
          source_query?: string | null
          started_at?: string | null
          status?: string | null
          table_name?: string | null
          total_records?: number | null
          validation_query?: string | null
          worker_id?: number | null
        }
        Relationships: []
      }
      migration_mappings: {
        Row: {
          entity_type: string
          legacy_id: number
          migrated_at: string | null
          migration_batch: string | null
          new_id: string
        }
        Insert: {
          entity_type: string
          legacy_id: number
          migrated_at?: string | null
          migration_batch?: string | null
          new_id: string
        }
        Update: {
          entity_type?: string
          legacy_id?: number
          migrated_at?: string | null
          migration_batch?: string | null
          new_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          description: string | null
          id: string
          is_accepted: boolean | null
          is_active: boolean | null
          legacy_offer_id: number | null
          metadata: Json | null
          offer_amount: number
          order_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_accepted?: boolean | null
          is_active?: boolean | null
          legacy_offer_id?: number | null
          metadata?: Json | null
          offer_amount: number
          order_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_accepted?: boolean | null
          is_active?: boolean | null
          legacy_offer_id?: number | null
          metadata?: Json | null
          offer_amount?: number
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      offices: {
        Row: {
          address: string | null
          apartment: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          is_active: boolean | null
          legacy_office_id: number | null
          metadata: Json | null
          name: string
          phone: string | null
          square_customer_id: string | null
          state: string | null
          tax_rate: number | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          apartment?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          is_active?: boolean | null
          legacy_office_id?: number | null
          metadata?: Json | null
          name: string
          phone?: string | null
          square_customer_id?: string | null
          state?: string | null
          tax_rate?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          apartment?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          is_active?: boolean | null
          legacy_office_id?: number | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          square_customer_id?: string | null
          state?: string | null
          tax_rate?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      operations: {
        Row: {
          case_id: string
          created_at: string | null
          details: Json | null
          id: string
          legacy_id: number | null
          operation_type: string
          operator_profile: string | null
          performed_at: string | null
          updated_at: string | null
        }
        Insert: {
          case_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          legacy_id?: number | null
          operation_type: string
          operator_profile?: string | null
          performed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          legacy_id?: number | null
          operation_type?: string
          operator_profile?: string | null
          performed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      order_cases: {
        Row: {
          case_id: string
          created_at: string | null
          id: string
          order_id: string
          relationship_type: string | null
        }
        Insert: {
          case_id: string
          created_at?: string | null
          id?: string
          order_id: string
          relationship_type?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string | null
          id?: string
          order_id?: string
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_cases_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_files: {
        Row: {
          category: string | null
          created_at: string | null
          file_id: string
          file_type: number | null
          id: string
          legacy_file_id: number
          legacy_instruction_id: number
          metadata: Json | null
          order_id: string
          parameters: Json | null
          product_id: number | null
          record_id: number | null
          status: number | null
          updated_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          file_id: string
          file_type?: number | null
          id?: string
          legacy_file_id: number
          legacy_instruction_id: number
          metadata?: Json | null
          order_id: string
          parameters?: Json | null
          product_id?: number | null
          record_id?: number | null
          status?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          file_id?: string
          file_type?: number | null
          id?: string
          legacy_file_id?: number
          legacy_instruction_id?: number
          metadata?: Json | null
          order_id?: string
          parameters?: Json | null
          product_id?: number | null
          record_id?: number | null
          status?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_states: {
        Row: {
          actor_id: string | null
          changed_at: string | null
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          is_active: boolean | null
          legacy_state_id: number | null
          metadata: Json | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          changed_at?: string | null
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          is_active?: boolean | null
          legacy_state_id?: number | null
          metadata?: Json | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          changed_at?: string | null
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          is_active?: boolean | null
          legacy_state_id?: number | null
          metadata?: Json | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_states_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number | null
          approved_at: string | null
          complaint: string | null
          course_type: Database["public"]["Enums"]["course_type"]
          created_at: string | null
          deleted: boolean | null
          deleted_at: string | null
          doctor_id: string
          exports: Json | null
          id: string
          legacy_instruction_id: number | null
          metadata: Json | null
          notes: string | null
          office_id: string | null
          order_number: string
          patient_id: string
          shipped_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          complaint?: string | null
          course_type: Database["public"]["Enums"]["course_type"]
          created_at?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          doctor_id: string
          exports?: Json | null
          id?: string
          legacy_instruction_id?: number | null
          metadata?: Json | null
          notes?: string | null
          office_id?: string | null
          order_number: string
          patient_id: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          complaint?: string | null
          course_type?: Database["public"]["Enums"]["course_type"]
          created_at?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          doctor_id?: string
          exports?: Json | null
          id?: string
          legacy_instruction_id?: number | null
          metadata?: Json | null
          notes?: string | null
          office_id?: string | null
          order_number?: string
          patient_id?: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_events: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          event_type: string
          id: string
          legacy_event_id: number | null
          metadata: Json | null
          order_id: string | null
          patient_id: string
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_type: string
          id?: string
          legacy_event_id?: number | null
          metadata?: Json | null
          order_id?: string | null
          patient_id: string
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_type?: string
          id?: string
          legacy_event_id?: number | null
          metadata?: Json | null
          order_id?: string | null
          patient_id?: string
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          archived: boolean | null
          assigned_office_id: string | null
          date_of_birth: string | null
          enrolled_at: string | null
          id: string
          insurance_info: Json | null
          legacy_patient_id: number | null
          legacy_user_id: number | null
          medical_history: Json | null
          patient_number: string | null
          primary_doctor_id: string | null
          profile_id: string
          schemes: string | null
          sex: Database["public"]["Enums"]["gender"] | null
          status: Database["public"]["Enums"]["patient_status_type"] | null
          suffix: string | null
          suspended: boolean | null
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          assigned_office_id?: string | null
          date_of_birth?: string | null
          enrolled_at?: string | null
          id?: string
          insurance_info?: Json | null
          legacy_patient_id?: number | null
          legacy_user_id?: number | null
          medical_history?: Json | null
          patient_number?: string | null
          primary_doctor_id?: string | null
          profile_id: string
          schemes?: string | null
          sex?: Database["public"]["Enums"]["gender"] | null
          status?: Database["public"]["Enums"]["patient_status_type"] | null
          suffix?: string | null
          suspended?: boolean | null
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          assigned_office_id?: string | null
          date_of_birth?: string | null
          enrolled_at?: string | null
          id?: string
          insurance_info?: Json | null
          legacy_patient_id?: number | null
          legacy_user_id?: number | null
          medical_history?: Json | null
          patient_number?: string | null
          primary_doctor_id?: string | null
          profile_id?: string
          schemes?: string | null
          sex?: Database["public"]["Enums"]["gender"] | null
          status?: Database["public"]["Enums"]["patient_status_type"] | null
          suffix?: string | null
          suspended?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_assigned_office_id_fkey"
            columns: ["assigned_office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_primary_doctor_id_fkey"
            columns: ["primary_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_items: {
        Row: {
          created_at: string | null
          id: string
          legacy_ware_id: number | null
          metadata: Json | null
          name: string
          payment_id: string
          product_id: string | null
          purchase_id: string | null
          quantity: number | null
          total_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          legacy_ware_id?: number | null
          metadata?: Json | null
          name: string
          payment_id: string
          product_id?: string | null
          purchase_id?: string | null
          quantity?: number | null
          total_amount: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          legacy_ware_id?: number | null
          metadata?: Json | null
          name?: string
          payment_id?: string
          product_id?: string | null
          purchase_id?: string | null
          quantity?: number | null
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_operations: {
        Row: {
          amount: number
          attempt_count: number | null
          card_bin: string | null
          card_brand: string | null
          card_last_four: string | null
          id: string
          is_office_card: boolean | null
          legacy_operation_id: number | null
          metadata: Json | null
          operation_type: string
          payment_id: string
          processed_at: string | null
          square_order_id: string | null
          square_payment_id: string | null
          square_refund_id: string | null
        }
        Insert: {
          amount: number
          attempt_count?: number | null
          card_bin?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          id?: string
          is_office_card?: boolean | null
          legacy_operation_id?: number | null
          metadata?: Json | null
          operation_type: string
          payment_id: string
          processed_at?: string | null
          square_order_id?: string | null
          square_payment_id?: string | null
          square_refund_id?: string | null
        }
        Update: {
          amount?: number
          attempt_count?: number | null
          card_bin?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          id?: string
          is_office_card?: boolean | null
          legacy_operation_id?: number | null
          metadata?: Json | null
          operation_type?: string
          payment_id?: string
          processed_at?: string | null
          square_order_id?: string | null
          square_payment_id?: string | null
          square_refund_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_operations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          external_payment_id: string | null
          id: string
          legacy_payment_id: number | null
          metadata: Json | null
          order_id: string
          patient_id: string | null
          payment_method: string | null
          processed_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          external_payment_id?: string | null
          id?: string
          legacy_payment_id?: number | null
          metadata?: Json | null
          order_id: string
          patient_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          external_payment_id?: string | null
          id?: string
          legacy_payment_id?: number | null
          metadata?: Json | null
          order_id?: string
          patient_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number | null
          course_type: Database["public"]["Enums"]["course_type"]
          created_at: string | null
          customization: Json | null
          id: string
          is_active: boolean | null
          legacy_course_id: number | null
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          course_type: Database["public"]["Enums"]["course_type"]
          created_at?: string | null
          customization?: Json | null
          id?: string
          is_active?: boolean | null
          legacy_course_id?: number | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          course_type?: Database["public"]["Enums"]["course_type"]
          created_at?: string | null
          customization?: Json | null
          id?: string
          is_active?: boolean | null
          legacy_course_id?: number | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          creator_id: string
          file_size_bytes: number | null
          file_uid: string | null
          id: string
          is_original: boolean | null
          is_public: boolean | null
          legacy_plan_id: number | null
          legacy_project_id: number | null
          metadata: Json | null
          mime_type: string | null
          name: string
          order_id: string | null
          plan_notes: string | null
          plan_number: number | null
          project_type: Database["public"]["Enums"]["project_type"]
          status: Database["public"]["Enums"]["project_status"]
          storage_path: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          file_size_bytes?: number | null
          file_uid?: string | null
          id?: string
          is_original?: boolean | null
          is_public?: boolean | null
          legacy_plan_id?: number | null
          legacy_project_id?: number | null
          metadata?: Json | null
          mime_type?: string | null
          name: string
          order_id?: string | null
          plan_notes?: string | null
          plan_number?: number | null
          project_type: Database["public"]["Enums"]["project_type"]
          status?: Database["public"]["Enums"]["project_status"]
          storage_path?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          file_size_bytes?: number | null
          file_uid?: string | null
          id?: string
          is_original?: boolean | null
          is_public?: boolean | null
          legacy_plan_id?: number | null
          legacy_project_id?: number | null
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          order_id?: string | null
          plan_notes?: string | null
          plan_number?: number | null
          project_type?: Database["public"]["Enums"]["project_type"]
          status?: Database["public"]["Enums"]["project_status"]
          storage_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          id: string
          legacy_purchase_id: number | null
          metadata: Json | null
          order_id: string
          product_id: string
          purchased_at: string | null
          quantity: number | null
          total_amount: number
          unit_price: number
        }
        Insert: {
          id?: string
          legacy_purchase_id?: number | null
          metadata?: Json | null
          order_id: string
          product_id: string
          purchased_at?: string | null
          quantity?: number | null
          total_amount: number
          unit_price: number
        }
        Update: {
          id?: string
          legacy_purchase_id?: number | null
          metadata?: Json | null
          order_id?: string
          product_id?: string
          purchased_at?: string | null
          quantity?: number | null
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          legacy_id: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          legacy_id?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          legacy_id?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          metadata: Json | null
          order_id: string
          shipped_at: string | null
          shipping_address: Json | null
          tracking_number: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          shipped_at?: string | null
          shipping_address?: Json | null
          tracking_number?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          shipped_at?: string | null
          shipping_address?: Json | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      storages: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          legacy_id: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          legacy_id?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          legacy_id?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_messages: {
        Row: {
          barcode: string | null
          carrier: string | null
          created_at: string
          id: string
          legacy_record_id: number | null
          message_code: string | null
          message_data: Json
          message_type: string
          order_id: string | null
          processed: boolean | null
          processed_at: string | null
          shipment_id: string | null
          source_system: string
          tracking_number: string | null
        }
        Insert: {
          barcode?: string | null
          carrier?: string | null
          created_at?: string
          id?: string
          legacy_record_id?: number | null
          message_code?: string | null
          message_data: Json
          message_type: string
          order_id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          shipment_id?: string | null
          source_system: string
          tracking_number?: string | null
        }
        Update: {
          barcode?: string | null
          carrier?: string | null
          created_at?: string
          id?: string
          legacy_record_id?: number | null
          message_code?: string | null
          message_data?: Json
          message_type?: string
          order_id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          shipment_id?: string | null
          source_system?: string
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_messages_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          action_name: string | null
          approved_at: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          checked: boolean | null
          completed_at: string | null
          description: string | null
          due_at: string | null
          id: string
          jaw_specification: number | null
          legacy_task_id: number | null
          metadata: Json | null
          order_id: string
          quality_notes: string | null
          quality_score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          template_id: string | null
          template_name: string
        }
        Insert: {
          action_name?: string | null
          approved_at?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          checked?: boolean | null
          completed_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          jaw_specification?: number | null
          legacy_task_id?: number | null
          metadata?: Json | null
          order_id: string
          quality_notes?: string | null
          quality_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          template_id?: string | null
          template_name: string
        }
        Update: {
          action_name?: string | null
          approved_at?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          checked?: boolean | null
          completed_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          jaw_specification?: number | null
          legacy_task_id?: number | null
          metadata?: Json | null
          order_id?: string
          quality_notes?: string | null
          quality_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          template_id?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      team_communications: {
        Row: {
          approval_required: boolean | null
          approved_at: string | null
          approved_by: string | null
          author_id: string
          body: string
          communication_type: Database["public"]["Enums"]["team_communication_type"]
          created_at: string
          department: string | null
          id: string
          is_broadcast: boolean | null
          legacy_record_id: number | null
          order_id: string | null
          project_id: string | null
          subject: string | null
          task_id: string | null
          team_id: string | null
          triggers_workflow: boolean | null
          visibility: string | null
          workflow_action: string | null
        }
        Insert: {
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          author_id: string
          body: string
          communication_type: Database["public"]["Enums"]["team_communication_type"]
          created_at?: string
          department?: string | null
          id?: string
          is_broadcast?: boolean | null
          legacy_record_id?: number | null
          order_id?: string | null
          project_id?: string | null
          subject?: string | null
          task_id?: string | null
          team_id?: string | null
          triggers_workflow?: boolean | null
          visibility?: string | null
          workflow_action?: string | null
        }
        Update: {
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          author_id?: string
          body?: string
          communication_type?: Database["public"]["Enums"]["team_communication_type"]
          created_at?: string
          department?: string | null
          id?: string
          is_broadcast?: boolean | null
          legacy_record_id?: number | null
          order_id?: string | null
          project_id?: string | null
          subject?: string | null
          task_id?: string | null
          team_id?: string | null
          triggers_workflow?: boolean | null
          visibility?: string | null
          workflow_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_team_comm_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_communications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_communications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_communications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      technician_roles: {
        Row: {
          abbreviation: string | null
          assigned_at: string | null
          id: string
          is_active: boolean | null
          legacy_role_id: number | null
          role_name: string
          role_type: Database["public"]["Enums"]["technician_type"]
          technician_id: string
        }
        Insert: {
          abbreviation?: string | null
          assigned_at?: string | null
          id?: string
          is_active?: boolean | null
          legacy_role_id?: number | null
          role_name: string
          role_type: Database["public"]["Enums"]["technician_type"]
          technician_id: string
        }
        Update: {
          abbreviation?: string | null
          assigned_at?: string | null
          id?: string
          is_active?: boolean | null
          legacy_role_id?: number | null
          role_name?: string
          role_type?: Database["public"]["Enums"]["technician_type"]
          technician_id?: string
        }
        Relationships: []
      }
      technicians: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          legacy_user_id: number | null
          metadata: Json | null
          phone: string | null
          profile_id: string | null
          specialty: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          legacy_user_id?: number | null
          metadata?: Json | null
          phone?: string | null
          profile_id?: string | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          legacy_user_id?: number | null
          metadata?: Json | null
          phone?: string | null
          profile_id?: string | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      template_edit_roles: {
        Row: {
          id: string
          role_id: string
          template_id: string
        }
        Insert: {
          id?: string
          role_id: string
          template_id: string
        }
        Update: {
          id?: string
          role_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_edit_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_edit_roles_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_predecessors: {
        Row: {
          id: string
          predecessor_id: string
          template_id: string
        }
        Insert: {
          id?: string
          predecessor_id: string
          template_id: string
        }
        Update: {
          id?: string
          predecessor_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_predecessors_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_predecessors_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_products: {
        Row: {
          id: string
          product_id: string
          quantity: number
          template_id: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity: number
          template_id: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_products_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_view_groups: {
        Row: {
          group_name: string
          id: string
          template_id: string
        }
        Insert: {
          group_name: string
          id?: string
          template_id: string
        }
        Update: {
          group_name?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_view_groups_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_view_roles: {
        Row: {
          id: string
          role_id: string
          template_id: string
        }
        Insert: {
          id?: string
          role_id: string
          template_id: string
        }
        Update: {
          id?: string
          role_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_view_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_view_roles_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          action_name: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean | null
          legacy_template_id: number | null
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          action_name?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          legacy_template_id?: number | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          action_name?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          legacy_template_id?: number | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_discussions: {
        Row: {
          action_completed: boolean | null
          author_id: string | null
          author_role: string | null
          comment_id: string | null
          content: string | null
          created_at: string
          discussion_type: string | null
          edited_at: string | null
          id: string
          is_visible_to_patient: boolean | null
          legacy_comment_id: number | null
          parent_comment_id: string | null
          project_id: string | null
          requires_action: boolean | null
          thread_id: string | null
          treatment_id: string
        }
        Insert: {
          action_completed?: boolean | null
          author_id?: string | null
          author_role?: string | null
          comment_id?: string | null
          content?: string | null
          created_at?: string
          discussion_type?: string | null
          edited_at?: string | null
          id?: string
          is_visible_to_patient?: boolean | null
          legacy_comment_id?: number | null
          parent_comment_id?: string | null
          project_id?: string | null
          requires_action?: boolean | null
          thread_id?: string | null
          treatment_id: string
        }
        Update: {
          action_completed?: boolean | null
          author_id?: string | null
          author_role?: string | null
          comment_id?: string | null
          content?: string | null
          created_at?: string
          discussion_type?: string | null
          edited_at?: string | null
          id?: string
          is_visible_to_patient?: boolean | null
          legacy_comment_id?: number | null
          parent_comment_id?: string | null
          project_id?: string | null
          requires_action?: boolean | null
          thread_id?: string | null
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_treatment_disc_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_discussions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_discussions_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "treatment_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          id: string
          is_original: boolean | null
          legacy_instruction_id: number | null
          legacy_plan_id: number | null
          metadata: Json | null
          order_id: string | null
          patient_id: string | null
          plan_name: string | null
          plan_notes: string | null
          plan_number: number | null
          project_id: string
          revision_count: number | null
          treatment_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          is_original?: boolean | null
          legacy_instruction_id?: number | null
          legacy_plan_id?: number | null
          metadata?: Json | null
          order_id?: string | null
          patient_id?: string | null
          plan_name?: string | null
          plan_notes?: string | null
          plan_number?: number | null
          project_id: string
          revision_count?: number | null
          treatment_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          is_original?: boolean | null
          legacy_instruction_id?: number | null
          legacy_plan_id?: number | null
          metadata?: Json | null
          order_id?: string | null
          patient_id?: string | null
          plan_name?: string | null
          plan_notes?: string | null
          plan_number?: number | null
          project_id?: string
          revision_count?: number | null
          treatment_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ware: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          legacy_id: number | null
          name: string
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          legacy_id?: number | null
          name: string
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          legacy_id?: number | null
          name?: string
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      batch_enrich_sentiment_with_openai: {
        Args: { api_key?: string; batch_size?: number }
        Returns: {
          api_cost_estimate: number
          message_id: string
          processing_status: string
          sentiment: string
        }[]
      }
      check_vector_extension: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      cleanup_orphaned_embeddings: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      deploy_edge_function: {
        Args: {
          entrypoint_path?: string
          function_files: Json[]
          function_name: string
          import_map_path?: string
          verify_jwt?: boolean
        }
        Returns: Json
      }
      enrich_message_sentiment: {
        Args: { message_id: string }
        Returns: Json
      }
      enrich_with_openai: {
        Args: { api_key: string; message_id: string }
        Returns: Json
      }
      exec_ddl: {
        Args: { sql: string }
        Returns: string
      }
      exec_sql: {
        Args: { query: string; read_only?: boolean } | { sql: string }
        Returns: string
      }
      get_edge_function_with_files: {
        Args: { function_name: string }
        Returns: Json
      }
      get_embedding_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_content_length: number
          embeddings_by_content_type: Json
          embeddings_by_model: Json
          embeddings_by_source_table: Json
          newest_embedding: string
          oldest_embedding: string
          total_embeddings: number
        }[]
      }
      get_table_schema: {
        Args: { table_name: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      initialize_migration_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      list_edge_functions_with_files: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      migrate_files_batch: {
        Args: { batch_files: Json }
        Returns: {
          case_files_inserted: number
          errors: string[]
          files_inserted: number
        }[]
      }
      populate_patient_events: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_messages_for_sentiment: {
        Args: { batch_size?: number }
        Returns: {
          http_request_id: number
          message_id: string
          processing_status: string
        }[]
      }
      run_sentiment_processing_job: {
        Args: Record<PropertyKey, never>
        Returns: {
          batch_number: number
          messages_processed: number
          processing_time: unknown
          total_cost_estimate: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      table_exists: {
        Args: { table_name: string }
        Returns: boolean
      }
      validate_profile_type: {
        Args: {
          expected_type: Database["public"]["Enums"]["profile_type"]
          profile_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      case_complexity_type:
        | "simple"
        | "moderate"
        | "complex"
        | "comprehensive"
        | "extraction"
        | "surgical"
        | "interceptive"
        | "retention_only"
      case_file_type:
        | "intraoral_photo"
        | "extraoral_photo"
        | "xray"
        | "cbct"
        | "stl_upper"
        | "stl_lower"
        | "stl_bite"
        | "impression"
        | "treatment_plan"
        | "progress_report"
        | "patient_form"
        | "lab_prescription"
        | "correspondence"
        | "insurance_document"
        | "medical_history"
        | "other"
      case_message_type:
        | "clinical_note"
        | "patient_question"
        | "doctor_response"
        | "lab_communication"
        | "appointment_reminder"
        | "treatment_update"
        | "administrative"
        | "emergency"
        | "prescription"
        | "insurance_note"
        | "billing_note"
        | "system_message"
        | "internal_note"
      case_state_enum:
        | "submitted"
        | "under_review"
        | "planning"
        | "approved"
        | "in_production"
        | "quality_check"
        | "shipped"
        | "delivered"
        | "completed"
        | "on_hold"
        | "cancelled"
      case_state_type:
        | "new"
        | "consultation_scheduled"
        | "consultation_completed"
        | "diagnosis_in_progress"
        | "awaiting_approval"
        | "treatment_approved"
        | "impressions_needed"
        | "impressions_received"
        | "treatment_planning"
        | "plan_review"
        | "plan_approved"
        | "manufacturing"
        | "quality_check"
        | "ready_for_delivery"
        | "delivered"
        | "treatment_active"
        | "mid_treatment_review"
        | "refinement_needed"
        | "refinement_active"
        | "retention_phase"
        | "follow_up"
        | "case_closed"
        | "discontinued"
      case_status_type:
        | "consultation"
        | "diagnosis"
        | "treatment_plan"
        | "active"
        | "refinement"
        | "retention"
        | "completed"
        | "cancelled"
        | "on_hold"
        | "transferred"
        | "revision"
      case_type_enum:
        | "initial_consultation"
        | "treatment_planning"
        | "active_treatment"
        | "refinement"
        | "retention"
        | "emergency"
        | "follow_up"
      clinical_communication_type:
        | "diagnosis_update"
        | "treatment_modification"
        | "clinical_observation"
        | "consultation_request"
        | "consultation_response"
        | "clinical_approval"
        | "clinical_concern"
      comment_type_enum:
        | "treatment_discussion"
        | "doctor_note"
        | "task_note"
        | "notification_context"
        | "record_annotation"
      communication_status: "sent" | "delivered" | "read" | "archived"
      course_type:
        | "main"
        | "refinement"
        | "any"
        | "replacement"
        | "invoice"
        | "merchandise"
      discount_type: "percentage" | "fixed_amount" | "free_shipping" | "bundle"
      doctor_status_type:
        | "active"
        | "pending"
        | "training"
        | "on_leave"
        | "suspended"
        | "retired"
        | "transferred"
        | "inactive"
        | "locum"
        | "consultant"
      embedding_content_type:
        | "case_summary"
        | "treatment_plan"
        | "notes"
        | "diagnosis"
      feedback_type:
        | "complaint"
        | "suggestion"
        | "compliment"
        | "quality_issue"
        | "service_issue"
        | "billing_dispute"
        | "general_feedback"
      file_type_enum:
        | "scan"
        | "photo"
        | "xray"
        | "document"
        | "model"
        | "simulation"
        | "other"
      gender: "male" | "female" | "other" | "unknown"
      gender_type: "male" | "female" | "other" | "prefer_not_to_say"
      message_priority: "low" | "normal" | "high" | "urgent"
      message_type_enum:
        | "general"
        | "status_update"
        | "question"
        | "instruction"
        | "approval_request"
        | "system_notification"
      migration_run_status: "running" | "completed" | "failed" | "pending"
      migration_type: "full" | "incremental"
      order_state_enum:
        | "pending"
        | "confirmed"
        | "in_production"
        | "quality_check"
        | "shipped"
        | "delivered"
        | "completed"
        | "cancelled"
        | "refunded"
      order_status:
        | "no_product"
        | "submitted"
        | "approved"
        | "in_production"
        | "shipped"
        | "add_plan"
        | "on_hold"
        | "cancelled"
      patient_status_type:
        | "active"
        | "consultation"
        | "treatment_plan"
        | "in_treatment"
        | "retention"
        | "completed"
        | "on_hold"
        | "cancelled"
        | "transferred"
        | "archived"
        | "prospect"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
      practice_role: "owner" | "doctor" | "technician" | "assistant" | "admin"
      priority_level: "low" | "medium" | "high" | "urgent"
      product_category:
        | "aligners"
        | "retainers"
        | "appliances"
        | "accessories"
        | "services"
      profile_type:
        | "patient"
        | "doctor"
        | "technician"
        | "master"
        | "sales_person"
        | "agent"
        | "client"
      project_status:
        | "draft"
        | "in_review"
        | "approved"
        | "in_progress"
        | "completed"
        | "archived"
        | "deleted"
      project_status_enum:
        | "draft"
        | "in_progress"
        | "review"
        | "approved"
        | "archived"
        | "deleted"
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
        | "other"
      project_type_enum:
        | "scan"
        | "model"
        | "simulation"
        | "treatment_plan"
        | "aligner_design"
        | "impression"
        | "xray"
        | "photo"
        | "document"
        | "other"
      severity: "critical" | "high" | "medium" | "low"
      task_function_enum:
        | "submit"
        | "review"
        | "approve"
        | "process"
        | "notify"
        | "archive"
        | "scan"
        | "model"
        | "manufacture"
        | "quality_check"
        | "ship"
      task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "approved"
        | "rejected"
        | "cancelled"
      team_communication_type:
        | "status_update"
        | "approval_request"
        | "approval_granted"
        | "approval_denied"
        | "task_assignment"
        | "quality_check"
        | "production_note"
        | "team_announcement"
      technician_type:
        | "sectioning"
        | "quality_control"
        | "designing"
        | "manufacturing"
        | "master"
        | "remote"
      treatment_status: "planning" | "active" | "completed" | "cancelled"
      urgency_level: "emergency" | "urgent" | "routine" | "informational"
      user_role: "doctor" | "technician" | "admin" | "support"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      case_complexity_type: [
        "simple",
        "moderate",
        "complex",
        "comprehensive",
        "extraction",
        "surgical",
        "interceptive",
        "retention_only",
      ],
      case_file_type: [
        "intraoral_photo",
        "extraoral_photo",
        "xray",
        "cbct",
        "stl_upper",
        "stl_lower",
        "stl_bite",
        "impression",
        "treatment_plan",
        "progress_report",
        "patient_form",
        "lab_prescription",
        "correspondence",
        "insurance_document",
        "medical_history",
        "other",
      ],
      case_message_type: [
        "clinical_note",
        "patient_question",
        "doctor_response",
        "lab_communication",
        "appointment_reminder",
        "treatment_update",
        "administrative",
        "emergency",
        "prescription",
        "insurance_note",
        "billing_note",
        "system_message",
        "internal_note",
      ],
      case_state_enum: [
        "submitted",
        "under_review",
        "planning",
        "approved",
        "in_production",
        "quality_check",
        "shipped",
        "delivered",
        "completed",
        "on_hold",
        "cancelled",
      ],
      case_state_type: [
        "new",
        "consultation_scheduled",
        "consultation_completed",
        "diagnosis_in_progress",
        "awaiting_approval",
        "treatment_approved",
        "impressions_needed",
        "impressions_received",
        "treatment_planning",
        "plan_review",
        "plan_approved",
        "manufacturing",
        "quality_check",
        "ready_for_delivery",
        "delivered",
        "treatment_active",
        "mid_treatment_review",
        "refinement_needed",
        "refinement_active",
        "retention_phase",
        "follow_up",
        "case_closed",
        "discontinued",
      ],
      case_status_type: [
        "consultation",
        "diagnosis",
        "treatment_plan",
        "active",
        "refinement",
        "retention",
        "completed",
        "cancelled",
        "on_hold",
        "transferred",
        "revision",
      ],
      case_type_enum: [
        "initial_consultation",
        "treatment_planning",
        "active_treatment",
        "refinement",
        "retention",
        "emergency",
        "follow_up",
      ],
      clinical_communication_type: [
        "diagnosis_update",
        "treatment_modification",
        "clinical_observation",
        "consultation_request",
        "consultation_response",
        "clinical_approval",
        "clinical_concern",
      ],
      comment_type_enum: [
        "treatment_discussion",
        "doctor_note",
        "task_note",
        "notification_context",
        "record_annotation",
      ],
      communication_status: ["sent", "delivered", "read", "archived"],
      course_type: [
        "main",
        "refinement",
        "any",
        "replacement",
        "invoice",
        "merchandise",
      ],
      discount_type: ["percentage", "fixed_amount", "free_shipping", "bundle"],
      doctor_status_type: [
        "active",
        "pending",
        "training",
        "on_leave",
        "suspended",
        "retired",
        "transferred",
        "inactive",
        "locum",
        "consultant",
      ],
      embedding_content_type: [
        "case_summary",
        "treatment_plan",
        "notes",
        "diagnosis",
      ],
      feedback_type: [
        "complaint",
        "suggestion",
        "compliment",
        "quality_issue",
        "service_issue",
        "billing_dispute",
        "general_feedback",
      ],
      file_type_enum: [
        "scan",
        "photo",
        "xray",
        "document",
        "model",
        "simulation",
        "other",
      ],
      gender: ["male", "female", "other", "unknown"],
      gender_type: ["male", "female", "other", "prefer_not_to_say"],
      message_priority: ["low", "normal", "high", "urgent"],
      message_type_enum: [
        "general",
        "status_update",
        "question",
        "instruction",
        "approval_request",
        "system_notification",
      ],
      migration_run_status: ["running", "completed", "failed", "pending"],
      migration_type: ["full", "incremental"],
      order_state_enum: [
        "pending",
        "confirmed",
        "in_production",
        "quality_check",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
        "refunded",
      ],
      order_status: [
        "no_product",
        "submitted",
        "approved",
        "in_production",
        "shipped",
        "add_plan",
        "on_hold",
        "cancelled",
      ],
      patient_status_type: [
        "active",
        "consultation",
        "treatment_plan",
        "in_treatment",
        "retention",
        "completed",
        "on_hold",
        "cancelled",
        "transferred",
        "archived",
        "prospect",
      ],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
        "cancelled",
      ],
      practice_role: ["owner", "doctor", "technician", "assistant", "admin"],
      priority_level: ["low", "medium", "high", "urgent"],
      product_category: [
        "aligners",
        "retainers",
        "appliances",
        "accessories",
        "services",
      ],
      profile_type: [
        "patient",
        "doctor",
        "technician",
        "master",
        "sales_person",
        "agent",
        "client",
      ],
      project_status: [
        "draft",
        "in_review",
        "approved",
        "in_progress",
        "completed",
        "archived",
        "deleted",
      ],
      project_status_enum: [
        "draft",
        "in_progress",
        "review",
        "approved",
        "archived",
        "deleted",
      ],
      project_type: [
        "treatment_plan",
        "stl_upper",
        "stl_lower",
        "clinical_photo",
        "xray",
        "cbct_scan",
        "simulation",
        "aligner_design",
        "document",
        "other",
      ],
      project_type_enum: [
        "scan",
        "model",
        "simulation",
        "treatment_plan",
        "aligner_design",
        "impression",
        "xray",
        "photo",
        "document",
        "other",
      ],
      severity: ["critical", "high", "medium", "low"],
      task_function_enum: [
        "submit",
        "review",
        "approve",
        "process",
        "notify",
        "archive",
        "scan",
        "model",
        "manufacture",
        "quality_check",
        "ship",
      ],
      task_status: [
        "pending",
        "in_progress",
        "completed",
        "approved",
        "rejected",
        "cancelled",
      ],
      team_communication_type: [
        "status_update",
        "approval_request",
        "approval_granted",
        "approval_denied",
        "task_assignment",
        "quality_check",
        "production_note",
        "team_announcement",
      ],
      technician_type: [
        "sectioning",
        "quality_control",
        "designing",
        "manufacturing",
        "master",
        "remote",
      ],
      treatment_status: ["planning", "active", "completed", "cancelled"],
      urgency_level: ["emergency", "urgent", "routine", "informational"],
      user_role: ["doctor", "technician", "admin", "support"],
    },
  },
} as const

