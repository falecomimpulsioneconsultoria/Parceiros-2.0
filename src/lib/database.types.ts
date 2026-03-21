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
          phone: string | null
          status: string
          balance: number
          referred_by: string | null
          partner_type: string | null
          level: string | null
          cpf: string | null
          rg: string | null
          birth_date: string | null
          gender: string | null
          address_zip_code: string | null
          address_street: string | null
          address_number: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_city: string | null
          address_state: string | null
          created_at: string
          updated_at: string | null
          person_type: string | null
        }
        Insert: {
          id: string
          role?: 'admin' | 'partner' | 'client'
          email?: string | null
          full_name?: string | null
          phone?: string | null
          status?: string
          balance?: number
          referred_by?: string | null
          partner_type?: string | null
          level?: string | null
          cpf?: string | null
          rg?: string | null
          birth_date?: string | null
          gender?: string | null
          address_zip_code?: string | null
          address_street?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          role?: 'admin' | 'partner' | 'client'
          email?: string | null
          full_name?: string | null
          phone?: string | null
          status?: string
          balance?: number
          referred_by?: string | null
          partner_type?: string | null
          level?: string | null
          cpf?: string | null
          rg?: string | null
          birth_date?: string | null
          gender?: string | null
          address_zip_code?: string | null
          address_street?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          created_at?: string
          updated_at?: string | null
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
          commission_value: number
          commission_direct: number
          commission_indicator: number
          commission_lvl1: number
          commission_lvl2: number
          commission_captador: number | null
          cost: number
          status: string
          link: string | null
          created_at: string
          payment_type: 'avista' | 'parcelado' | null
          installment_config: Json | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          commission_rate: number
          commission_value?: number
          commission_direct?: number
          commission_indicator?: number
          commission_lvl1?: number
          commission_lvl2?: number
          commission_captador?: number | null
          cost?: number
          status?: string
          link?: string | null
          created_at?: string
          payment_type?: 'avista' | 'parcelado' | null
          installment_config?: Json | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          commission_rate?: number
          commission_value?: number
          commission_direct?: number
          commission_indicator?: number
          commission_lvl1?: number
          commission_lvl2?: number
          commission_captador?: number | null
          cost?: number
          status?: string
          link?: string | null
          created_at?: string
          payment_type?: 'avista' | 'parcelado' | null
          installment_config?: Json | null
        }
        Relationships: []
      }
      lead_deals: {
        Row: {
          id: string
          lead_id: string
          partner_id: string
          product_id: string | null
          status: string
          value: number
          payment_method: string | null
          notes: string | null
          execution_status: string | null
          pending_description: string | null
          pending_document_url: string | null
          partner_role: string | null
          captador_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          partner_id: string
          product_id?: string | null
          status?: string
          value?: number
          payment_method?: string | null
          notes?: string | null
          execution_status?: string | null
          pending_description?: string | null
          pending_document_url?: string | null
          partner_role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          partner_id?: string
          product_id?: string | null
          status?: string
          value?: number
          payment_method?: string | null
          notes?: string | null
          execution_status?: string | null
          pending_description?: string | null
          pending_document_url?: string | null
          partner_role?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "lead_deals_lead_id_fkey"; columns: ["lead_id"]; referencedRelation: "leads"; referencedColumns: ["id"] },
          { foreignKeyName: "lead_deals_partner_id_fkey"; columns: ["partner_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "lead_deals_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }
        ]
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
          payment_method: string | null
          created_at: string
          cpf: string | null
          rg: string | null
          birth_date: string | null
          gender: string | null
          address_zip_code: string | null
          address_street: string | null
          address_number: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_city: string | null
          address_state: string | null
          captador_id: string | null
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
          payment_method?: string | null
          created_at?: string
          cpf?: string | null
          rg?: string | null
          birth_date?: string | null
          gender?: string | null
          address_zip_code?: string | null
          address_street?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          captador_id?: string | null
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
          payment_method?: string | null
          created_at?: string
          cpf?: string | null
          rg?: string | null
          birth_date?: string | null
          gender?: string | null
          address_zip_code?: string | null
          address_street?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          captador_id?: string | null
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
          deal_id: string | null
          product_id: string | null
          amount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          partner_id: string
          lead_id?: string | null
          deal_id?: string | null
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
      partner_products: {
        Row: {
          id: string
          partner_id: string
          product_id: string
          redirect_phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          partner_id: string
          product_id: string
          redirect_phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          partner_id?: string
          product_id?: string
          redirect_phone?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_qrcodes: {
        Row: {
          id: string
          partner_product_id: string
          name: string
          redirect_phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          partner_product_id: string
          name: string
          redirect_phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          partner_product_id?: string
          name?: string
          redirect_phone?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_qrcodes_partner_product_id_fkey"
            columns: ["partner_product_id"]
            isOneToOne: false
            referencedRelation: "partner_products"
            referencedColumns: ["id"]
          }
        ]
      }
      system_settings: {
        Row: {
          id: number
          login_image_url: string | null
          lead_stages: Json | null
          min_withdrawal: number
          withdrawal_fee: number
          release_days: number
          infinitepay_tag: string | null
          infinitepay_api_key: string | null
          created_at: string
        }
        Insert: {
          id?: number
          login_image_url?: string | null
          lead_stages?: Json | null
          min_withdrawal?: number
          withdrawal_fee?: number
          release_days?: number
          infinitepay_tag?: string | null
          infinitepay_api_key?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          login_image_url?: string | null
          lead_stages?: Json | null
          min_withdrawal?: number
          withdrawal_fee?: number
          release_days?: number
          infinitepay_tag?: string | null
          infinitepay_api_key?: string | null
          created_at?: string
        }
        Relationships: []
      }
      deal_installments: {
        Row: {
          id: string
          deal_id: string | null
          installment_number: number
          label: string
          value: number
          status: string
          due_date: string | null
          paid_at: string | null
          commissions_config: Json | null
          created_at: string
          payment_link: string | null
          external_id: string | null
          payment_provider: string | null
        }
        Insert: {
          id?: string
          deal_id?: string | null
          installment_number: number
          label: string
          value: number
          status?: string
          due_date?: string | null
          paid_at?: string | null
          commissions_config?: Json | null
          created_at?: string
          payment_link?: string | null
          external_id?: string | null
          payment_provider?: string | null
        }
        Update: {
          id?: string
          deal_id?: string | null
          installment_number?: number
          label?: string
          value?: number
          status?: string
          due_date?: string | null
          paid_at?: string | null
          commissions_config?: Json | null
          created_at?: string
          payment_link?: string | null
          external_id?: string | null
          payment_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_installments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "lead_deals"
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
