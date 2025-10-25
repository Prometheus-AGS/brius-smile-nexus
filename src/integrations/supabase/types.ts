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
      account_emailaddress: {
        Row: {
          email: string
          id: number
          primary: boolean
          user_id: number
          verified: boolean
        }
        Insert: {
          email: string
          id?: number
          primary?: boolean
          user_id: number
          verified?: boolean
        }
        Update: {
          email?: string
          id?: number
          primary?: boolean
          user_id?: number
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "account_emailaddress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      account_emailconfirmation: {
        Row: {
          created: string
          email_address_id: number
          id: number
          key: string
          sent: string | null
        }
        Insert: {
          created?: string
          email_address_id: number
          id?: number
          key: string
          sent?: string | null
        }
        Update: {
          created?: string
          email_address_id?: number
          id?: number
          key?: string
          sent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_emailconfirmation_email_address_id_fkey"
            columns: ["email_address_id"]
            isOneToOne: false
            referencedRelation: "account_emailaddress"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_id: number
          appointment_type: string | null
          created_at: string | null
          department_id: number | null
          doctor_id: number | null
          end_time: string | null
          notes: string | null
          patient_id: string | null
          reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_id?: number
          appointment_type?: string | null
          created_at?: string | null
          department_id?: number | null
          doctor_id?: number | null
          end_time?: string | null
          notes?: string | null
          patient_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_id?: number
          appointment_type?: string | null
          created_at?: string | null
          department_id?: number | null
          doctor_id?: number | null
          end_time?: string | null
          notes?: string | null
          patient_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["patient_id"]
          },
        ]
      }
      auth_group: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      auth_group_permissions: {
        Row: {
          group_id: number
          id: number
          permission_id: number
        }
        Insert: {
          group_id: number
          id?: number
          permission_id: number
        }
        Update: {
          group_id?: number
          id?: number
          permission_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "auth_group_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "auth_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_group_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "auth_permission"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_permission: {
        Row: {
          codename: string
          content_type_id: number
          id: number
          name: string
        }
        Insert: {
          codename: string
          content_type_id: number
          id?: number
          name: string
        }
        Update: {
          codename?: string
          content_type_id?: number
          id?: number
          name?: string
        }
        Relationships: []
      }
      auth_user: {
        Row: {
          date_joined: string
          email: string
          first_name: string
          id: number
          is_active: boolean
          is_staff: boolean
          is_superuser: boolean
          last_login: string | null
          last_name: string
          password: string
          username: string
        }
        Insert: {
          date_joined?: string
          email: string
          first_name?: string
          id?: number
          is_active?: boolean
          is_staff?: boolean
          is_superuser?: boolean
          last_login?: string | null
          last_name?: string
          password: string
          username: string
        }
        Update: {
          date_joined?: string
          email?: string
          first_name?: string
          id?: number
          is_active?: boolean
          is_staff?: boolean
          is_superuser?: boolean
          last_login?: string | null
          last_name?: string
          password?: string
          username?: string
        }
        Relationships: []
      }
      auth_user_groups: {
        Row: {
          group_id: number
          id: number
          user_id: number
        }
        Insert: {
          group_id: number
          id?: number
          user_id: number
        }
        Update: {
          group_id?: number
          id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "auth_user_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "auth_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_user_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_user_user_permissions: {
        Row: {
          id: number
          permission_id: number
          user_id: number
        }
        Insert: {
          id?: number
          permission_id: number
          user_id: number
        }
        Update: {
          id?: number
          permission_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "auth_user_user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "auth_permission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_user_user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          department_code: string | null
          department_id: number
          department_name: string
          location: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_code?: string | null
          department_id?: number
          department_name: string
          location?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_code?: string | null
          department_id?: number
          department_name?: string
          location?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          appointment_id: number | null
          created_at: string | null
          diagnosis_code: string | null
          diagnosis_date: string
          diagnosis_description: string
          diagnosis_id: number
          doctor_id: number | null
          notes: string | null
          patient_id: string | null
          severity: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: number | null
          created_at?: string | null
          diagnosis_code?: string | null
          diagnosis_date: string
          diagnosis_description: string
          diagnosis_id?: number
          doctor_id?: number | null
          notes?: string | null
          patient_id?: string | null
          severity?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: number | null
          created_at?: string | null
          diagnosis_code?: string | null
          diagnosis_date?: string
          diagnosis_description?: string
          diagnosis_id?: number
          doctor_id?: number | null
          notes?: string | null
          patient_id?: string | null
          severity?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "diagnoses_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["patient_id"]
          },
        ]
      }
      dispatch_agent: {
        Row: {
          address: string
          cpu: number
          id: number
          memory: number
          memory_used: number
          name: string
          port: number
        }
        Insert: {
          address: string
          cpu: number
          id?: number
          memory: number
          memory_used?: number
          name: string
          port: number
        }
        Update: {
          address?: string
          cpu?: number
          id?: number
          memory?: number
          memory_used?: number
          name?: string
          port?: number
        }
        Relationships: []
      }
      dispatch_bracket: {
        Row: {
          id: number
          name: string | null
          project_id: number | null
        }
        Insert: {
          id?: number
          name?: string | null
          project_id?: number | null
        }
        Update: {
          id?: number
          name?: string | null
          project_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_bracket_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "dispatch_project"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_clinicalpreference: {
        Row: {
          id: number
          notes: string | null
          user_id: number
        }
        Insert: {
          id?: number
          notes?: string | null
          user_id: number
        }
        Update: {
          id?: number
          notes?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_clinicalpreference_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_comment: {
        Row: {
          author_id: number
          created_at: string
          id: number
          plan_id: number
          text: string | null
        }
        Insert: {
          author_id: number
          created_at?: string
          id?: number
          plan_id: number
          text?: string | null
        }
        Update: {
          author_id?: number
          created_at?: string
          id?: number
          plan_id?: number
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_comment_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_comment_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "dispatch_plan"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_file: {
        Row: {
          created_at: string
          ext: string | null
          id: number
          instruction_id: number | null
          name: string | null
          size: number
          type: number
          uid: string
        }
        Insert: {
          created_at?: string
          ext?: string | null
          id?: number
          instruction_id?: number | null
          name?: string | null
          size?: number
          type: number
          uid?: string
        }
        Update: {
          created_at?: string
          ext?: string | null
          id?: number
          instruction_id?: number | null
          name?: string | null
          size?: number
          type?: number
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_file_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "dispatch_instruction"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_globalsetting: {
        Row: {
          id: number
          reset_discount_date: string | null
          support_email: string | null
          version: number
        }
        Insert: {
          id?: number
          reset_discount_date?: string | null
          support_email?: string | null
          version?: number
        }
        Update: {
          id?: number
          reset_discount_date?: string | null
          support_email?: string | null
          version?: number
        }
        Relationships: []
      }
      dispatch_instance: {
        Row: {
          agent_id: number | null
          id: number
          opener_id: number | null
          port: number
          project_id: number
          queue: number
          run_at: string
        }
        Insert: {
          agent_id?: number | null
          id?: number
          opener_id?: number | null
          port: number
          project_id: number
          queue?: number
          run_at: string
        }
        Update: {
          agent_id?: number | null
          id?: number
          opener_id?: number | null
          port?: number
          project_id?: number
          queue?: number
          run_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_instance_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dispatch_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_instance_opener_id_fkey"
            columns: ["opener_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_instance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "dispatch_project"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_instruction: {
        Row: {
          aligner_id: number | null
          anchorge: number | null
          bond_teeth: string | null
          course: number
          designer_id: number | null
          extract_teeth: string | null
          extraction: boolean | null
          id: number
          lower_buccal: boolean | null
          manufacturer_id: number | null
          model: number | null
          name: string | null
          notes: string | null
          patient_id: number
          product_id: number | null
          sectioner_id: number | null
          upper_buccal: boolean | null
        }
        Insert: {
          aligner_id?: number | null
          anchorge?: number | null
          bond_teeth?: string | null
          course?: number
          designer_id?: number | null
          extract_teeth?: string | null
          extraction?: boolean | null
          id?: number
          lower_buccal?: boolean | null
          manufacturer_id?: number | null
          model?: number | null
          name?: string | null
          notes?: string | null
          patient_id: number
          product_id?: number | null
          sectioner_id?: number | null
          upper_buccal?: boolean | null
        }
        Update: {
          aligner_id?: number | null
          anchorge?: number | null
          bond_teeth?: string | null
          course?: number
          designer_id?: number | null
          extract_teeth?: string | null
          extraction?: boolean | null
          id?: number
          lower_buccal?: boolean | null
          manufacturer_id?: number | null
          model?: number | null
          name?: string | null
          notes?: string | null
          patient_id?: number
          product_id?: number | null
          sectioner_id?: number | null
          upper_buccal?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_instruction_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "dispatch_patient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_instruction_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "dispatch_product"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_notification: {
        Row: {
          created_at: string
          id: number
          item_id: number | null
          item_type_id: number | null
          read: boolean
          recipient_id: number
          sender: string
          sent: boolean
          template_context: string
          template_name: string
        }
        Insert: {
          created_at?: string
          id?: number
          item_id?: number | null
          item_type_id?: number | null
          read?: boolean
          recipient_id: number
          sender: string
          sent?: boolean
          template_context: string
          template_name: string
        }
        Update: {
          created_at?: string
          id?: number
          item_id?: number | null
          item_type_id?: number | null
          read?: boolean
          recipient_id?: number
          sender?: string
          sent?: boolean
          template_context?: string
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_notification_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_offer: {
        Row: {
          discount: number | null
          discount_count: number | null
          discount_finish: string | null
          discount_reason: string | null
          discount_start: string | null
          discount_used: number | null
          doctor_id: number | null
          id: number
          price_both: number | null
          price_lower: number | null
          price_upper: number | null
          product_id: number
        }
        Insert: {
          discount?: number | null
          discount_count?: number | null
          discount_finish?: string | null
          discount_reason?: string | null
          discount_start?: string | null
          discount_used?: number | null
          doctor_id?: number | null
          id?: number
          price_both?: number | null
          price_lower?: number | null
          price_upper?: number | null
          product_id: number
        }
        Update: {
          discount?: number | null
          discount_count?: number | null
          discount_finish?: string | null
          discount_reason?: string | null
          discount_start?: string | null
          discount_used?: number | null
          doctor_id?: number | null
          id?: number
          price_both?: number | null
          price_lower?: number | null
          price_upper?: number | null
          product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_offer_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_offer_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "dispatch_product"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_office: {
        Row: {
          address: string | null
          apt: string | null
          city: string | null
          country: string | null
          doctor_id: number
          id: number
          name: string | null
          phone: string | null
          state: string | null
          tax_rate: number
          zip: string | null
        }
        Insert: {
          address?: string | null
          apt?: string | null
          city?: string | null
          country?: string | null
          doctor_id: number
          id?: number
          name?: string | null
          phone?: string | null
          state?: string | null
          tax_rate?: number
          zip?: string | null
        }
        Update: {
          address?: string | null
          apt?: string | null
          city?: string | null
          country?: string | null
          doctor_id?: number
          id?: number
          name?: string | null
          phone?: string | null
          state?: string | null
          tax_rate?: number
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_office_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_patient: {
        Row: {
          archived: boolean
          birthdate: string | null
          doctor_id: number | null
          id: number
          office_id: number | null
          price: number | null
          user_id: number
        }
        Insert: {
          archived?: boolean
          birthdate?: string | null
          doctor_id?: number | null
          id?: number
          office_id?: number | null
          price?: number | null
          user_id: number
        }
        Update: {
          archived?: boolean
          birthdate?: string | null
          doctor_id?: number | null
          id?: number
          office_id?: number | null
          price?: number | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_patient_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_patient_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "dispatch_office"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_patient_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_payment: {
        Row: {
          base_price: number
          card_bin: string | null
          card_brand: string | null
          card_last: string | null
          discount_percent: number | null
          discount_price: number | null
          discount_reason: string | null
          discount_value: number | null
          free: boolean
          full_price: number
          id: number
          instruction_id: number
          order_id: string | null
          paid_at: string
          patient_price: boolean
          payment_id: string | null
          tax: number
          tax_rate: number
        }
        Insert: {
          base_price: number
          card_bin?: string | null
          card_brand?: string | null
          card_last?: string | null
          discount_percent?: number | null
          discount_price?: number | null
          discount_reason?: string | null
          discount_value?: number | null
          free?: boolean
          full_price: number
          id?: number
          instruction_id: number
          order_id?: string | null
          paid_at?: string
          patient_price?: boolean
          payment_id?: string | null
          tax?: number
          tax_rate?: number
        }
        Update: {
          base_price?: number
          card_bin?: string | null
          card_brand?: string | null
          card_last?: string | null
          discount_percent?: number | null
          discount_price?: number | null
          discount_reason?: string | null
          discount_value?: number | null
          free?: boolean
          full_price?: number
          id?: number
          instruction_id?: number
          order_id?: string | null
          paid_at?: string
          patient_price?: boolean
          payment_id?: string | null
          tax?: number
          tax_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_payment_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "dispatch_instruction"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_plan: {
        Row: {
          id: number
          instruction_id: number
          notes: string | null
          number: number | null
          project_id: number
        }
        Insert: {
          id?: number
          instruction_id: number
          notes?: string | null
          number?: number | null
          project_id: number
        }
        Update: {
          id?: number
          instruction_id?: number
          notes?: string | null
          number?: number | null
          project_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_plan_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "dispatch_instruction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_plan_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "dispatch_project"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_product: {
        Row: {
          course: number | null
          deleted: boolean
          descr: string | null
          free: boolean
          id: number
          name: string | null
          predefined: boolean
        }
        Insert: {
          course?: number | null
          deleted?: boolean
          descr?: string | null
          free?: boolean
          id?: number
          name?: string | null
          predefined?: boolean
        }
        Update: {
          course?: number | null
          deleted?: boolean
          descr?: string | null
          free?: boolean
          id?: number
          name?: string | null
          predefined?: boolean
        }
        Relationships: []
      }
      dispatch_project: {
        Row: {
          created_at: string
          creator_id: number | null
          id: number
          name: string
          public: boolean
          size: number
          status: number
          type: number
          uid: string
        }
        Insert: {
          created_at?: string
          creator_id?: number | null
          id?: number
          name: string
          public?: boolean
          size?: number
          status?: number
          type: number
          uid?: string
        }
        Update: {
          created_at?: string
          creator_id?: number | null
          id?: number
          name?: string
          public?: boolean
          size?: number
          status?: number
          type?: number
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_project_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_storage: {
        Row: {
          address: string
          disk_free: number
          disk_total: number
          id: number
          name: string
          port: number
        }
        Insert: {
          address: string
          disk_free: number
          disk_total: number
          id?: number
          name: string
          port: number
        }
        Update: {
          address?: string
          disk_free?: number
          disk_total?: number
          id?: number
          name?: string
          port?: number
        }
        Relationships: []
      }
      dispatch_task: {
        Row: {
          checked: boolean
          checked2: boolean
          done_at: string | null
          file_id: number | null
          file2_id: number | null
          id: number
          instruction_id: number
          plan_id: number | null
          template_id: number
          text: string | null
        }
        Insert: {
          checked?: boolean
          checked2?: boolean
          done_at?: string | null
          file_id?: number | null
          file2_id?: number | null
          id?: number
          instruction_id: number
          plan_id?: number | null
          template_id: number
          text?: string | null
        }
        Update: {
          checked?: boolean
          checked2?: boolean
          done_at?: string | null
          file_id?: number | null
          file2_id?: number | null
          id?: number
          instruction_id?: number
          plan_id?: number | null
          template_id?: number
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_task_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "dispatch_file"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_task_file2_id_fkey"
            columns: ["file2_id"]
            isOneToOne: false
            referencedRelation: "dispatch_file"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_task_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "dispatch_instruction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_task_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "dispatch_plan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_task_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dispatch_template"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_template: {
        Row: {
          action_name: string | null
          edit_role_id: number | null
          extensions: string | null
          function: number | null
          id: number
          jaws: number | null
          predefined: boolean
          product_id: number | null
          read_only: boolean
          status: number | null
          task_name: string | null
          text_name: string | null
          time: number
        }
        Insert: {
          action_name?: string | null
          edit_role_id?: number | null
          extensions?: string | null
          function?: number | null
          id?: number
          jaws?: number | null
          predefined?: boolean
          product_id?: number | null
          read_only?: boolean
          status?: number | null
          task_name?: string | null
          text_name?: string | null
          time?: number
        }
        Update: {
          action_name?: string | null
          edit_role_id?: number | null
          extensions?: string | null
          function?: number | null
          id?: number
          jaws?: number | null
          predefined?: boolean
          product_id?: number | null
          read_only?: boolean
          status?: number | null
          task_name?: string | null
          text_name?: string | null
          time?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_template_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "dispatch_product"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_template_predecessors: {
        Row: {
          from_template_id: number
          id: number
          to_template_id: number
        }
        Insert: {
          from_template_id: number
          id?: number
          to_template_id: number
        }
        Update: {
          from_template_id?: number
          id?: number
          to_template_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_template_predecessors_from_template_id_fkey"
            columns: ["from_template_id"]
            isOneToOne: false
            referencedRelation: "dispatch_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_template_predecessors_to_template_id_fkey"
            columns: ["to_template_id"]
            isOneToOne: false
            referencedRelation: "dispatch_template"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_template_view_roles: {
        Row: {
          group_id: number
          id: number
          template_id: number
        }
        Insert: {
          group_id: number
          id?: number
          template_id: number
        }
        Update: {
          group_id?: number
          id?: number
          template_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_template_view_roles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "auth_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_template_view_roles_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dispatch_template"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_usersetting: {
        Row: {
          emails: boolean
          id: number
          require_2fa: boolean | null
          user_id: number
        }
        Insert: {
          emails?: boolean
          id?: number
          require_2fa?: boolean | null
          user_id: number
        }
        Update: {
          emails?: boolean
          id?: number
          require_2fa?: boolean | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_usersetting_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string | null
          department_id: number | null
          doctor_id: number
          email: string | null
          first_name: string
          last_name: string
          license_number: string | null
          phone: string | null
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: number | null
          doctor_id?: number
          email?: string | null
          first_name: string
          last_name: string
          license_number?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: number | null
          doctor_id?: number
          email?: string | null
          first_name?: string
          last_name?: string
          license_number?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["department_id"]
          },
        ]
      }
      insurance_details: {
        Row: {
          coverage_end_date: string | null
          coverage_start_date: string | null
          created_at: string | null
          group_number: string | null
          insurance_id: number
          is_primary: boolean | null
          patient_id: string | null
          policy_number: string
          provider_name: string
          updated_at: string | null
        }
        Insert: {
          coverage_end_date?: string | null
          coverage_start_date?: string | null
          created_at?: string | null
          group_number?: string | null
          insurance_id?: number
          is_primary?: boolean | null
          patient_id?: string | null
          policy_number: string
          provider_name: string
          updated_at?: string | null
        }
        Update: {
          coverage_end_date?: string | null
          coverage_start_date?: string | null
          created_at?: string | null
          group_number?: string | null
          insurance_id?: number
          is_primary?: boolean | null
          patient_id?: string | null
          policy_number?: string
          provider_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_details_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["patient_id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          attachment_id: number
          file_name: string
          file_path: string | null
          file_size: number | null
          file_type: string | null
          message_id: number | null
          uploaded_at: string | null
        }
        Insert: {
          attachment_id?: number
          file_name: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          message_id?: number | null
          uploaded_at?: string | null
        }
        Update: {
          attachment_id?: number
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          message_id?: number | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["message_id"]
          },
        ]
      }
      messages: {
        Row: {
          appointment_id: number | null
          created_at: string | null
          doctor_id: number | null
          is_read: boolean | null
          message_date: string
          message_id: number
          message_text: string
          patient_id: string | null
          replied_to_message_id: number | null
          sender_type: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: number | null
          created_at?: string | null
          doctor_id?: number | null
          is_read?: boolean | null
          message_date?: string
          message_id?: number
          message_text: string
          patient_id?: string | null
          replied_to_message_id?: number | null
          sender_type: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: number | null
          created_at?: string | null
          doctor_id?: number | null
          is_read?: boolean | null
          message_date?: string
          message_id?: number
          message_text?: string
          patient_id?: string | null
          replied_to_message_id?: number | null
          sender_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "messages_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "messages_replied_to_message_id_fkey"
            columns: ["replied_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["message_id"]
          },
        ]
      }
      otp_email_emaildevice: {
        Row: {
          confirmed: boolean
          id: number
          key: string
          name: string
          user_id: number
        }
        Insert: {
          confirmed?: boolean
          id?: number
          key: string
          name: string
          user_id: number
        }
        Update: {
          confirmed?: boolean
          id?: number
          key?: string
          name?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "otp_email_emaildevice_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_contacts: {
        Row: {
          contact_id: number
          contact_type: string
          created_at: string | null
          email: string | null
          first_name: string
          is_primary: boolean | null
          last_name: string
          patient_id: string | null
          phone: string
          relationship: string | null
          updated_at: string | null
        }
        Insert: {
          contact_id?: number
          contact_type: string
          created_at?: string | null
          email?: string | null
          first_name: string
          is_primary?: boolean | null
          last_name: string
          patient_id?: string | null
          phone: string
          relationship?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_id?: number
          contact_type?: string
          created_at?: string | null
          email?: string | null
          first_name?: string
          is_primary?: boolean | null
          last_name?: string
          patient_id?: string | null
          phone?: string
          relationship?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["patient_id"]
          },
        ]
      }
      patients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          allergies: string | null
          blood_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          gender: string | null
          last_name: string
          patient_id: string
          phone_primary: string | null
          phone_secondary: string | null
          postal_code: string | null
          social_security_number: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          allergies?: string | null
          blood_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          last_name: string
          patient_id: string
          phone_primary?: string | null
          phone_secondary?: string | null
          postal_code?: string | null
          social_security_number?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          allergies?: string | null
          blood_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          last_name?: string
          patient_id?: string
          phone_primary?: string | null
          phone_secondary?: string | null
          postal_code?: string | null
          social_security_number?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      treatments: {
        Row: {
          created_at: string | null
          diagnosis_id: number | null
          doctor_id: number | null
          dosage: string | null
          end_date: string | null
          frequency: string | null
          notes: string | null
          patient_id: string | null
          start_date: string
          treatment_description: string
          treatment_id: number
          treatment_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          diagnosis_id?: number | null
          doctor_id?: number | null
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          notes?: string | null
          patient_id?: string | null
          start_date: string
          treatment_description: string
          treatment_id?: number
          treatment_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          diagnosis_id?: number | null
          doctor_id?: number | null
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          notes?: string | null
          patient_id?: string | null
          start_date?: string
          treatment_description?: string
          treatment_id?: number
          treatment_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["diagnosis_id"]
          },
          {
            foreignKeyName: "treatments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "treatments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["patient_id"]
          },
        ]
      }
      system_roles: {
        Row: {
          id: string
          name: string
          description: string | null
          permissions: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          permissions?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          permissions?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      knowledge_documents: {
        Row: {
          id: string
          title: string
          content: string
          file_path: string | null
          file_type: string | null
          file_size: number | null
          category: string | null
          tags: string[] | null
          upload_user_id: string | null
          processing_status: string | null
          processed_at: string | null
          created_at: string | null
          updated_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          title: string
          content: string
          file_path?: string | null
          file_type?: string | null
          file_size?: number | null
          category?: string | null
          tags?: string[] | null
          upload_user_id?: string | null
          processing_status?: string | null
          processed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          title?: string
          content?: string
          file_path?: string | null
          file_type?: string | null
          file_size?: number | null
          category?: string | null
          tags?: string[] | null
          upload_user_id?: string | null
          processing_status?: string | null
          processed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          id: string
          document_id: string
          chunk_index: number
          content: string
          embedding: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          document_id: string
          chunk_index: number
          content: string
          embedding?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          document_id?: string
          chunk_index?: number
          content?: string
          embedding?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          }
        ]
      }
      }
      user_system_roles: {
        Row: {
          id: string
          user_id: string
          role_id: string
          assigned_by: string | null
          assigned_at: string
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          assigned_by?: string | null
          assigned_at?: string
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          assigned_by?: string | null
          assigned_at?: string
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_system_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "system_roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
