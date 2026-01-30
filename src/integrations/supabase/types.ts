export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_generated_plans: {
        Row: {
          content: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          id: string
          plan_type: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          plan_type: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          plan_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ai_generated_plans_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_predictions: {
        Row: {
          confidence_score: number | null
          contract_id: string | null
          created_at: string
          equipment_id: string | null
          id: string
          predicted_date: string | null
          prediction_type: string
          reasoning: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          contract_id?: string | null
          created_at?: string
          equipment_id?: string | null
          id?: string
          predicted_date?: string | null
          prediction_type: string
          reasoning?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          contract_id?: string | null
          created_at?: string
          equipment_id?: string | null
          id?: string
          predicted_date?: string | null
          prediction_type?: string
          reasoning?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_predictions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_predictions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          agent_id: string
          contract_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string
          contract_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          contract_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          name: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          name: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          name?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_status: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string | null
          secondary_phone: string | null
          state: string | null
          status_id: string | null
          updated_at: string
          user_id: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          secondary_phone?: string | null
          state?: string | null
          status_id?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          secondary_phone?: string | null
          state?: string | null
          status_id?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "client_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_clients_status_id"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "client_status"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          category: string | null
          contract_id: string
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          name: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          contract_id: string
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          name: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          contract_id?: string
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          name?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contract_documents_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_services: {
        Row: {
          contract_id: string
          created_at: string
          description: string | null
          duration: number | null
          frequency: string
          id: string
          order_index: number | null
          service_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          description?: string | null
          duration?: number | null
          frequency?: string
          id?: string
          order_index?: number | null
          service_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          frequency?: string
          id?: string
          order_index?: number | null
          service_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_services_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_address: string | null
          client_city: string | null
          client_cnpj: string | null
          client_contact_person: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_neighborhood: string | null
          client_number: string | null
          client_phone: string | null
          client_state: string | null
          client_zip_code: string | null
          contract_number: string
          contract_type: string
          created_at: string
          description: string | null
          end_date: string | null
          equipment_brand: string | null
          equipment_condition: string | null
          equipment_location: string | null
          equipment_model: string | null
          equipment_power: string | null
          equipment_serial: string | null
          equipment_type: string | null
          equipment_voltage: string | null
          equipment_year: string | null
          id: string
          maintenance_frequency: string | null
          payment_terms: string | null
          services: Json | null
          special_conditions: string | null
          start_date: string | null
          status: string | null
          technical_notes: string | null
          updated_at: string
          user_id: string | null
          value: number | null
          warranty_terms: string | null
        }
        Insert: {
          client_address?: string | null
          client_city?: string | null
          client_cnpj?: string | null
          client_contact_person?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_neighborhood?: string | null
          client_number?: string | null
          client_phone?: string | null
          client_state?: string | null
          client_zip_code?: string | null
          contract_number: string
          contract_type: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          equipment_brand?: string | null
          equipment_condition?: string | null
          equipment_location?: string | null
          equipment_model?: string | null
          equipment_power?: string | null
          equipment_serial?: string | null
          equipment_type?: string | null
          equipment_voltage?: string | null
          equipment_year?: string | null
          id?: string
          maintenance_frequency?: string | null
          payment_terms?: string | null
          services?: Json | null
          special_conditions?: string | null
          start_date?: string | null
          status?: string | null
          technical_notes?: string | null
          updated_at?: string
          user_id?: string | null
          value?: number | null
          warranty_terms?: string | null
        }
        Update: {
          client_address?: string | null
          client_city?: string | null
          client_cnpj?: string | null
          client_contact_person?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_neighborhood?: string | null
          client_number?: string | null
          client_phone?: string | null
          client_state?: string | null
          client_zip_code?: string | null
          contract_number?: string
          contract_type?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          equipment_brand?: string | null
          equipment_condition?: string | null
          equipment_location?: string | null
          equipment_model?: string | null
          equipment_power?: string | null
          equipment_serial?: string | null
          equipment_type?: string | null
          equipment_voltage?: string | null
          equipment_year?: string | null
          id?: string
          maintenance_frequency?: string | null
          payment_terms?: string | null
          services?: Json | null
          special_conditions?: string | null
          start_date?: string | null
          status?: string | null
          technical_notes?: string | null
          updated_at?: string
          user_id?: string | null
          value?: number | null
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          contract_id: string | null
          created_at: string
          id: string
          installation_date: string | null
          location: string | null
          manufacturer: string | null
          model: string | null
          observations: string | null
          quantity: number | null
          serial_number: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          id?: string
          installation_date?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          observations?: string | null
          quantity?: number | null
          serial_number?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          id?: string
          installation_date?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          observations?: string | null
          quantity?: number | null
          serial_number?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_equipment_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          charts: Json
          content: string
          created_at: string
          data: Json
          description: string
          id: string
          period_end: string | null
          period_start: string | null
          prompt: string | null
          report_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          charts?: Json
          content: string
          created_at?: string
          data?: Json
          description: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          prompt?: string | null
          report_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          charts?: Json
          content?: string
          created_at?: string
          data?: Json
          description?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          prompt?: string | null
          report_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_checklist_items: {
        Row: {
          checklist_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean | null
          is_required: boolean | null
          item_type: string | null
          order_index: number | null
          photo_urls: string[] | null
          title: string
          updated_at: string
          value: string | null
        }
        Insert: {
          checklist_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          item_type?: string | null
          order_index?: number | null
          photo_urls?: string[] | null
          title: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          checklist_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          item_type?: string | null
          order_index?: number | null
          photo_urls?: string[] | null
          title?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_maintenance_checklist_items_checklist_id"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "maintenance_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_checklists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_template: boolean | null
          maintenance_id: string | null
          name: string
          template_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          maintenance_id?: string | null
          name: string
          template_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          maintenance_id?: string | null
          name?: string
          template_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_maintenance_checklists_maintenance_id"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_maintenance_checklists_maintenance_id"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          maintenance_id: string
          name: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          maintenance_id: string
          name: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          maintenance_id?: string
          name?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_maintenance_documents_maintenance_id"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_maintenance_documents_maintenance_id"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_documents_maintenance_id_fkey"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_documents_maintenance_id_fkey"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_status: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      maintenances: {
        Row: {
          alert_level: string | null
          alert_message: string | null
          client_name: string | null
          color_status: string | null
          color_type: string | null
          completed_date: string | null
          contract_id: string | null
          contract_number: string | null
          created_at: string
          description: string | null
          equipment_id: string | null
          estimated_duration: number | null
          frequency: string | null
          id: string
          notes: string | null
          priority: string | null
          recurrence_parent_id: string | null
          recurrence_sequence: number | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_id: string | null
          status: string | null
          status_id: string | null
          technician: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          alert_level?: string | null
          alert_message?: string | null
          client_name?: string | null
          color_status?: string | null
          color_type?: string | null
          completed_date?: string | null
          contract_id?: string | null
          contract_number?: string | null
          created_at?: string
          description?: string | null
          equipment_id?: string | null
          estimated_duration?: number | null
          frequency?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          recurrence_parent_id?: string | null
          recurrence_sequence?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_id?: string | null
          status?: string | null
          status_id?: string | null
          technician?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          alert_level?: string | null
          alert_message?: string | null
          client_name?: string | null
          color_status?: string | null
          color_type?: string | null
          completed_date?: string | null
          contract_id?: string | null
          contract_number?: string | null
          created_at?: string
          description?: string | null
          equipment_id?: string | null
          estimated_duration?: number | null
          frequency?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          recurrence_parent_id?: string | null
          recurrence_sequence?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_id?: string | null
          status?: string | null
          status_id?: string | null
          technician?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_maintenances_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_maintenances_equipment_id"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_maintenances_status_id"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "maintenance_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenances_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenances_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenances_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "contract_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenances_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "maintenance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      maintenances_with_details: {
        Row: {
          alert_level: string | null
          alert_message: string | null
          color_status: string | null
          color_type: string | null
          completed_date: string | null
          contract_client_name: string | null
          contract_id: string | null
          contract_number: string | null
          created_at: string | null
          description: string | null
          equipment_id: string | null
          equipment_model: string | null
          equipment_type: string | null
          estimated_duration: number | null
          frequency: string | null
          id: string | null
          notes: string | null
          priority: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
          status_color: string | null
          status_id: string | null
          status_name: string | null
          technician: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_maintenances_contract_id"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_maintenances_equipment_id"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_maintenances_status_id"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "maintenance_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenances_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenances_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenances_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "maintenance_status"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      clean_orphaned_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
