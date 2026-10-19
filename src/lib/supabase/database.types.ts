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
      invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          notes: string
          paid_at: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string
          paid_at?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string
          paid_at?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          project_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          project_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          project_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string
          created_at: string
          full_name: string
          id: string
          phone: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string
          created_at?: string
          full_name?: string
          id: string
          phone?: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          id: string
          project_id: string
          file_name: string
          file_url: string
          file_size: number
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          file_name: string
          file_url: string
          file_size?: number
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          file_name?: string
          file_url?: string
          file_size?: number
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          id: string
          project_id: string
          actor_id: string | null
          action: string
          details: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          actor_id?: string | null
          action: string
          details?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          actor_id?: string | null
          action?: string
          details?: string
          created_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          status: string
          nama: string
          kontak: string | null
          whatsapp: string | null
          kota: string | null
          jenis_website: string | null
          jenis_website_lainnya: string | null
          bidang_usaha: string | null
          deskripsi_bisnis: string | null
          usp: string | null
          tujuan_utama: string | null
          halaman_section: string | null
          fitur: string[] | null
          kesiapan_konten: string | null
          status_domain: string | null
          status_hosting: string | null
          mood_desain: string | null
          warna_brand: string | null
          status_logo: string | null
          link_referensi: string | null
          budget_tier: string | null
          deadline: string | null
          aset_urls: string[] | null
          catatan: string | null
          converted_to_client_id: string | null
          converted_to_project_id: string | null
          converted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          status?: string
          nama: string
          kontak?: string | null
          whatsapp?: string | null
          kota?: string | null
          jenis_website?: string | null
          jenis_website_lainnya?: string | null
          bidang_usaha?: string | null
          deskripsi_bisnis?: string | null
          usp?: string | null
          tujuan_utama?: string | null
          halaman_section?: string | null
          fitur?: string[] | null
          kesiapan_konten?: string | null
          status_domain?: string | null
          status_hosting?: string | null
          mood_desain?: string | null
          warna_brand?: string | null
          status_logo?: string | null
          link_referensi?: string | null
          budget_tier?: string | null
          deadline?: string | null
          aset_urls?: string[] | null
          catatan?: string | null
          converted_to_client_id?: string | null
          converted_to_project_id?: string | null
          converted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: string
          nama?: string
          kontak?: string | null
          whatsapp?: string | null
          kota?: string | null
          jenis_website?: string | null
          jenis_website_lainnya?: string | null
          bidang_usaha?: string | null
          deskripsi_bisnis?: string | null
          usp?: string | null
          tujuan_utama?: string | null
          halaman_section?: string | null
          fitur?: string[] | null
          kesiapan_konten?: string | null
          status_domain?: string | null
          status_hosting?: string | null
          mood_desain?: string | null
          warna_brand?: string | null
          status_logo?: string | null
          link_referensi?: string | null
          budget_tier?: string | null
          deadline?: string | null
          aset_urls?: string[] | null
          catatan?: string | null
          converted_to_client_id?: string | null
          converted_to_project_id?: string | null
          converted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string
          created_at: string
          description: string
          end_date: string | null
          id: string
          name: string
          progress: number
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string
          end_date?: string | null
          id?: string
          name: string
          progress?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string
          end_date?: string | null
          id?: string
          name?: string
          progress?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
