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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          attendees: string[] | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string
          event_type: string
          id: string
          location: string | null
          related_process_id: string | null
          related_task_id: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time: string
          event_type?: string
          id?: string
          location?: string | null
          related_process_id?: string | null
          related_task_id?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          location?: string | null
          related_process_id?: string | null
          related_task_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      candidate_responses: {
        Row: {
          age: number | null
          c_score: number | null
          company: string | null
          completion_date: string | null
          created_at: string
          d_score: number | null
          dominant_profile: string | null
          email: string | null
          i_score: number | null
          id: string
          is_completed: boolean
          name: string
          responses: Json
          s_score: number | null
          test_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          age?: number | null
          c_score?: number | null
          company?: string | null
          completion_date?: string | null
          created_at?: string
          d_score?: number | null
          dominant_profile?: string | null
          email?: string | null
          i_score?: number | null
          id?: string
          is_completed?: boolean
          name: string
          responses?: Json
          s_score?: number | null
          test_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          age?: number | null
          c_score?: number | null
          company?: string | null
          completion_date?: string | null
          created_at?: string
          d_score?: number | null
          dominant_profile?: string | null
          email?: string | null
          i_score?: number | null
          id?: string
          is_completed?: boolean
          name?: string
          responses?: Json
          s_score?: number | null
          test_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      disc_responses: {
        Row: {
          c_score: number | null
          completion_date: string | null
          created_at: string
          d_score: number | null
          dominant_profile: string | null
          i_score: number | null
          id: string
          is_completed: boolean
          responses: Json
          s_score: number | null
          test_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          c_score?: number | null
          completion_date?: string | null
          created_at?: string
          d_score?: number | null
          dominant_profile?: string | null
          i_score?: number | null
          id?: string
          is_completed?: boolean
          responses?: Json
          s_score?: number | null
          test_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          c_score?: number | null
          completion_date?: string | null
          created_at?: string
          d_score?: number | null
          dominant_profile?: string | null
          i_score?: number | null
          id?: string
          is_completed?: boolean
          responses?: Json
          s_score?: number | null
          test_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disc_responses_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "disc_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      disc_tests: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          title: string
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_nps_responses: {
        Row: {
          created_at: string
          date: string
          id: string
          responses: Json
          survey_id: string
          target_employee_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          responses?: Json
          survey_id: string
          target_employee_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          responses?: Json
          survey_id?: string
          target_employee_id?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_nps_surveys: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          questions: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          questions?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          questions?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          current_value: number
          deadline: string | null
          department: string | null
          description: string | null
          id: string
          participants: string[] | null
          status: string
          target_value: number
          title: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          current_value?: number
          deadline?: string | null
          department?: string | null
          description?: string | null
          id?: string
          participants?: string[] | null
          status?: string
          target_value: number
          title: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          current_value?: number
          deadline?: string | null
          department?: string | null
          description?: string | null
          id?: string
          participants?: string[] | null
          status?: string
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_candidate_evaluations: {
        Row: {
          created_at: string
          evaluator_id: string
          id: string
          job_response_id: string
          notes: string | null
          rating: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluator_id: string
          id?: string
          job_response_id: string
          notes?: string | null
          rating?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluator_id?: string
          id?: string
          job_response_id?: string
          notes?: string | null
          rating?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_candidate_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_candidate_evaluations_job_response_id_fkey"
            columns: ["job_response_id"]
            isOneToOne: false
            referencedRelation: "job_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      job_responses: {
        Row: {
          address: string | null
          age: number | null
          cep: string | null
          created_at: string
          email: string
          id: string
          instagram: string | null
          linkedin: string | null
          name: string
          phone: string | null
          responses: Json
          survey_id: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          cep?: string | null
          created_at?: string
          email: string
          id?: string
          instagram?: string | null
          linkedin?: string | null
          name: string
          phone?: string | null
          responses?: Json
          survey_id: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          cep?: string | null
          created_at?: string
          email?: string
          id?: string
          instagram?: string | null
          linkedin?: string | null
          name?: string
          phone?: string | null
          responses?: Json
          survey_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      job_surveys: {
        Row: {
          benefits: Json | null
          commission_details: string | null
          company_logo: string | null
          company_name: string | null
          contract_type: string | null
          created_at: string
          created_by: string
          daily_schedule: Json | null
          department: string | null
          description: string | null
          has_commission: boolean | null
          id: string
          is_active: boolean
          location: string | null
          lunch_break: string | null
          position_title: string
          questions: Json
          requirements: Json | null
          salary_max: number | null
          salary_min: number | null
          salary_range: string | null
          slug: string | null
          title: string
          updated_at: string
          weekly_hours: number | null
          work_days: Json | null
          work_modality: string | null
          work_schedule: string | null
        }
        Insert: {
          benefits?: Json | null
          commission_details?: string | null
          company_logo?: string | null
          company_name?: string | null
          contract_type?: string | null
          created_at?: string
          created_by: string
          daily_schedule?: Json | null
          department?: string | null
          description?: string | null
          has_commission?: boolean | null
          id?: string
          is_active?: boolean
          location?: string | null
          lunch_break?: string | null
          position_title: string
          questions?: Json
          requirements?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          slug?: string | null
          title: string
          updated_at?: string
          weekly_hours?: number | null
          work_days?: Json | null
          work_modality?: string | null
          work_schedule?: string | null
        }
        Update: {
          benefits?: Json | null
          commission_details?: string | null
          company_logo?: string | null
          company_name?: string | null
          contract_type?: string | null
          created_at?: string
          created_by?: string
          daily_schedule?: Json | null
          department?: string | null
          description?: string | null
          has_commission?: boolean | null
          id?: string
          is_active?: boolean
          location?: string | null
          lunch_break?: string | null
          position_title?: string
          questions?: Json
          requirements?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          slug?: string | null
          title?: string
          updated_at?: string
          weekly_hours?: number | null
          work_days?: Json | null
          work_modality?: string | null
          work_schedule?: string | null
        }
        Relationships: []
      }
      kv_store_2c4defad: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          last_watched_seconds: number
          lesson_id: string
          progress: number
          training_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_watched_seconds?: number
          lesson_id: string
          progress?: number
          training_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_watched_seconds?: number
          lesson_id?: string
          progress?: number
          training_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          created_at: string
          date: string
          id: string
          responses: Json
          survey_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          responses?: Json
          survey_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          responses?: Json
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "nps_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_surveys: {
        Row: {
          allowed_respondents: string[] | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          questions: Json
          target_employees: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          allowed_respondents?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          questions?: Json
          target_employees?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          allowed_respondents?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          questions?: Json
          target_employees?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          level: number
          name: string
          permissions: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          level?: number
          name: string
          permissions?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          level?: number
          name?: string
          permissions?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      process_tags: {
        Row: {
          created_at: string
          id: string
          process_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          process_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          process_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      process_templates: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          template_data: Json
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      processes: {
        Row: {
          activities: Json | null
          automations: string[] | null
          category_id: string | null
          created_at: string
          created_by: string
          department: string
          flow_edges: Json | null
          flow_nodes: Json | null
          id: string
          media_files: Json | null
          metrics: string[] | null
          name: string
          objective: string
          owner: string
          participants: string[] | null
          priority: number | null
          status: string
          tags: string[] | null
          updated_at: string
          youtube_video_id: string | null
        }
        Insert: {
          activities?: Json | null
          automations?: string[] | null
          category_id?: string | null
          created_at?: string
          created_by: string
          department: string
          flow_edges?: Json | null
          flow_nodes?: Json | null
          id?: string
          media_files?: Json | null
          metrics?: string[] | null
          name: string
          objective: string
          owner: string
          participants?: string[] | null
          priority?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          youtube_video_id?: string | null
        }
        Update: {
          activities?: Json | null
          automations?: string[] | null
          category_id?: string | null
          created_at?: string
          created_by?: string
          department?: string
          flow_edges?: Json | null
          flow_nodes?: Json | null
          id?: string
          media_files?: Json | null
          metrics?: string[] | null
          name?: string
          objective?: string
          owner?: string
          participants?: string[] | null
          priority?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_qualities: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string
          id: string
          marca: string
          modelo: string
          nome: string
          qualidade: string
          updated_at: string
          valor_dinheiro_pix: number
          valor_parcelado_6x: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por: string
          id?: string
          marca: string
          modelo: string
          nome: string
          qualidade: string
          updated_at?: string
          valor_dinheiro_pix?: number
          valor_parcelado_6x?: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          id?: string
          marca?: string
          modelo?: string
          nome?: string
          qualidade?: string
          updated_at?: string
          valor_dinheiro_pix?: number
          valor_parcelado_6x?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          department: string | null
          display_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category_id: string | null
          checklist: Json | null
          comments: Json | null
          created_at: string
          created_by: string
          deadline: string
          description: string | null
          id: string
          name: string
          process_id: string | null
          progress_percentage: number | null
          responsible_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          checklist?: Json | null
          comments?: Json | null
          created_at?: string
          created_by: string
          deadline: string
          description?: string | null
          id?: string
          name: string
          process_id?: string | null
          progress_percentage?: number | null
          responsible_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          checklist?: Json | null
          comments?: Json | null
          created_at?: string
          created_by?: string
          deadline?: string
          description?: string | null
          id?: string
          name?: string
          process_id?: string | null
          progress_percentage?: number | null
          responsible_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      team_permissions: {
        Row: {
          created_at: string
          department_name: string
          enabled: boolean
          id: string
          permission_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_name: string
          enabled?: boolean
          id?: string
          permission_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_name?: string
          enabled?: boolean
          id?: string
          permission_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_clock: {
        Row: {
          break_end: string | null
          break_start: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          id: string
          ip_address: string | null
          location: string | null
          lunch_end: string | null
          lunch_start: string | null
          notes: string | null
          status: string
          total_hours: unknown
          updated_at: string
          user_id: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date: string
          id?: string
          ip_address?: string | null
          location?: string | null
          lunch_end?: string | null
          lunch_start?: string | null
          notes?: string | null
          status?: string
          total_hours?: unknown
          updated_at?: string
          user_id: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          id?: string
          ip_address?: string | null
          location?: string | null
          lunch_end?: string | null
          lunch_start?: string | null
          notes?: string | null
          status?: string
          total_hours?: unknown
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          completed_at: string | null
          due_date: string | null
          last_watched_seconds: number
          progress: number
          status: Database["public"]["Enums"]["training_status"]
          training_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          due_date?: string | null
          last_watched_seconds?: number
          progress?: number
          status?: Database["public"]["Enums"]["training_status"]
          training_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          due_date?: string | null
          last_watched_seconds?: number
          progress?: number
          status?: Database["public"]["Enums"]["training_status"]
          training_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_lessons: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          module_id: string
          order_index: number
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id: string
          order_index?: number
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          training_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
          training_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          mandatory: boolean
          thumbnail_url: string | null
          title: string
          training_type: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          mandatory?: boolean
          thumbnail_url?: string | null
          title: string
          training_type?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          mandatory?: boolean
          thumbnail_url?: string | null
          title?: string
          training_type?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_position_departments: {
        Row: {
          created_at: string
          department_name: string
          id: string
          is_primary: boolean | null
          position_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_name: string
          id?: string
          is_primary?: boolean | null
          position_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_name?: string
          id?: string
          is_primary?: boolean | null
          position_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_position_departments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_produtos: {
        Args: { p_limit?: number; q: string }
        Returns: {
          marca: string
          modelo: string
          nome: string
          qualidade: string
          tipo: string
        }[]
      }
      can_access_process: { Args: { _process_id: string }; Returns: boolean }
      get_current_user_department: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_approved: { Args: never; Returns: boolean }
      log_user_activity: {
        Args: {
          p_activity_type: string
          p_description: string
          p_entity_id?: string
          p_entity_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      produto_por_nome: {
        Args: { p_nome: string }
        Returns: {
          disponivel: boolean
          garantia_dias: number
          marca: string
          modelo: string
          nome: string
          observacoes: string
          qualidade: string
          tempo_reparo_minutos: number
          tipo: string
          valor_dinheiro_pix: number
          valor_parcelado_6x: number
        }[]
      }
      update_overdue_tasks: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "member"
      training_status: "assigned" | "in_progress" | "completed"
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
      app_role: ["admin", "member"],
      training_status: ["assigned", "in_progress", "completed"],
    },
  },
} as const
