export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'partner' | 'client'
          email: string | null
          full_name: string | null
          status: string
          balance: number
          referred_by: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'partner' | 'client'
          email?: string | null
          full_name?: string | null
          status?: string
          balance?: number
          referred_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'partner' | 'client'
          email?: string | null
          full_name?: string | null
          status?: string
          balance?: number
          referred_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          commission_rate: number
          status: string
          link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          commission_rate: number
          status?: string
          link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          commission_rate?: number
          status?: string
          link?: string | null
          created_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          partner_id: string
          product_id: string | null
          name: string
          email: string
          phone: string | null
          status: string
          value: number
          created_at: string
        }
        Insert: {
          id?: string
          partner_id: string
          product_id?: string | null
          name: string
          email: string
          phone?: string | null
          status?: string
          value?: number
          created_at?: string
        }
        Update: {
          id?: string
          partner_id?: string
          product_id?: string | null
          name?: string
          email?: string
          phone?: string | null
          status?: string
          value?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      commissions: {
        Row: {
          id: string
          partner_id: string
          lead_id: string | null
          product_id: string | null
          amount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          partner_id: string
          lead_id?: string | null
          product_id?: string | null
          amount: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          partner_id?: string
          lead_id?: string | null
          product_id?: string | null
          amount?: number
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      withdrawals: {
        Row: {
          id: string
          partner_id: string
          amount: number
          status: string
          pix_key: string
          created_at: string
        }
        Insert: {
          id?: string
          partner_id: string
          amount: number
          status?: string
          pix_key: string
          created_at?: string
        }
        Update: {
          id?: string
          partner_id?: string
          amount?: number
          status?: string
          pix_key?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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
