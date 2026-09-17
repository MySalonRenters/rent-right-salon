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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agreement_signatures: {
        Row: {
          agreement_id: string
          agreement_snapshot: string
          id: string
          ip_address: string | null
          signature_path: string | null
          signed_at: string
          signer_id: string
          signer_role: string
          typed_name: string
        }
        Insert: {
          agreement_id: string
          agreement_snapshot: string
          id?: string
          ip_address?: string | null
          signature_path?: string | null
          signed_at?: string
          signer_id: string
          signer_role?: string
          typed_name: string
        }
        Update: {
          agreement_id?: string
          agreement_snapshot?: string
          id?: string
          ip_address?: string | null
          signature_path?: string | null
          signed_at?: string
          signer_id?: string
          signer_role?: string
          typed_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_signatures_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          salon_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          salon_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_templates_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_versions: {
        Row: {
          agreement_id: string
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          title: string
          version: number
        }
        Insert: {
          agreement_id: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          version: number
        }
        Update: {
          agreement_id?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agreement_versions_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      agreements: {
        Row: {
          body: string | null
          chair_id: string | null
          created_at: string
          file_path: string | null
          id: string
          kind: Database["public"]["Enums"]["agreement_kind"]
          owner_signed_at: string | null
          renter_id: string
          renter_signed_at: string | null
          salon_id: string
          sent_at: string | null
          signed_at: string | null
          signed_file_path: string | null
          status: Database["public"]["Enums"]["agreement_status"]
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          chair_id?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["agreement_kind"]
          owner_signed_at?: string | null
          renter_id: string
          renter_signed_at?: string | null
          salon_id: string
          sent_at?: string | null
          signed_at?: string | null
          signed_file_path?: string | null
          status?: Database["public"]["Enums"]["agreement_status"]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          chair_id?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["agreement_kind"]
          owner_signed_at?: string | null
          renter_id?: string
          renter_signed_at?: string | null
          salon_id?: string
          sent_at?: string | null
          signed_at?: string | null
          signed_file_path?: string | null
          status?: Database["public"]["Enums"]["agreement_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreements_chair_id_fkey"
            columns: ["chair_id"]
            isOneToOne: false
            referencedRelation: "chairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      chairs: {
        Row: {
          created_at: string
          cycle: Database["public"]["Enums"]["billing_cycle"]
          description: string | null
          fee_paid_by: string
          id: string
          name: string
          rent_amount: number
          salon_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle?: Database["public"]["Enums"]["billing_cycle"]
          description?: string | null
          fee_paid_by?: string
          id?: string
          name: string
          rent_amount?: number
          salon_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle?: Database["public"]["Enums"]["billing_cycle"]
          description?: string | null
          fee_paid_by?: string
          id?: string
          name?: string
          rent_amount?: number
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chairs_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          chair_id: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          salon_id: string
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          chair_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          salon_id: string
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          chair_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          salon_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_chair_id_fkey"
            columns: ["chair_id"]
            isOneToOne: false
            referencedRelation: "chairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      job_locks: {
        Row: {
          job_name: string
          last_run_at: string | null
          locked_until: string
          paused_at: string | null
          paused_reason: string | null
          updated_at: string
        }
        Insert: {
          job_name: string
          last_run_at?: string | null
          locked_until: string
          paused_at?: string | null
          paused_reason?: string | null
          updated_at?: string
        }
        Update: {
          job_name?: string
          last_run_at?: string | null
          locked_until?: string
          paused_at?: string | null
          paused_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meta_registration_events: {
        Row: {
          blocked_reason: string | null
          browser_sent_at: string | null
          created_at: string
          event_id: string
          occurred_at: string
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          browser_sent_at?: string | null
          created_at?: string
          event_id?: string
          occurred_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          browser_sent_at?: string | null
          created_at?: string
          event_id?: string
          occurred_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          charge_id: string | null
          created_at: string
          id: string
          read_at: string | null
          salon_id: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          charge_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          salon_id: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          charge_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          salon_id?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "rent_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          charge_id: string | null
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          paid_at: string
          receipt_issued_at: string | null
          receipt_number: string | null
          reference: string | null
          renter_id: string
          salon_id: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
        }
        Insert: {
          amount: number
          charge_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_at?: string
          receipt_issued_at?: string | null
          receipt_number?: string | null
          reference?: string | null
          renter_id: string
          salon_id: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Update: {
          amount?: number
          charge_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_at?: string
          receipt_issued_at?: string | null
          receipt_number?: string | null
          reference?: string | null
          renter_id?: string
          salon_id?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "rent_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
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
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rent_charges: {
        Row: {
          amount: number
          chair_id: string | null
          created_at: string
          currency: string
          due_date: string
          id: string
          note: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          renter_id: string
          salon_id: string
          status: Database["public"]["Enums"]["charge_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          chair_id?: string | null
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          note?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          renter_id: string
          salon_id: string
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          chair_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          renter_id?: string
          salon_id?: string
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_charges_chair_id_fkey"
            columns: ["chair_id"]
            isOneToOne: false
            referencedRelation: "chairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_charges_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_members: {
        Row: {
          active: boolean
          chair_id: string | null
          created_at: string
          id: string
          salon_id: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          chair_id?: string | null
          created_at?: string
          id?: string
          salon_id: string
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          chair_id?: string | null
          created_at?: string
          id?: string
          salon_id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_members_chair_fk"
            columns: ["chair_id"]
            isOneToOne: false
            referencedRelation: "chairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_members_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          address: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_payment_reference: string | null
          bank_sort_code: string | null
          bank_transfer_enabled: boolean
          created_at: string
          currency: string
          id: string
          name: string
          owner_id: string
          phone: string | null
          stripe_account_env: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_details_submitted: boolean
          stripe_payouts_enabled: boolean
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_payment_reference?: string | null
          bank_sort_code?: string | null
          bank_transfer_enabled?: boolean
          created_at?: string
          currency?: string
          id?: string
          name: string
          owner_id: string
          phone?: string | null
          stripe_account_env?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_payment_reference?: string | null
          bank_sort_code?: string | null
          bank_transfer_enabled?: boolean
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
          stripe_account_env?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      claim_meta_registration_event: {
        Args: { _user_id: string }
        Returns: {
          browser_sent_at: string
          event_id: string
          occurred_at: string
          status: string
        }[]
      }
    }
    Enums: {
      agreement_kind: "template" | "upload"
      agreement_status: "draft" | "sent" | "signed"
      app_role: "owner" | "renter"
      billing_cycle: "weekly" | "monthly"
      charge_status: "pending" | "paid" | "overdue" | "void"
      invite_status: "pending" | "accepted" | "revoked"
      payment_method: "card" | "cash" | "bank_transfer" | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      agreement_kind: ["template", "upload"],
      agreement_status: ["draft", "sent", "signed"],
      app_role: ["owner", "renter"],
      billing_cycle: ["weekly", "monthly"],
      charge_status: ["pending", "paid", "overdue", "void"],
      invite_status: ["pending", "accepted", "revoked"],
      payment_method: ["card", "cash", "bank_transfer", "other"],
    },
  },
} as const
