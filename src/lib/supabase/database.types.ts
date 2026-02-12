export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// ENUMS
// ============================================================
export type UserRole =
  | 'admin_nomadays'
  | 'support_nomadays'
  | 'dmc_manager'
  | 'dmc_seller'
  | 'dmc_accountant'
  | 'client_direct'
  | 'agency_b2b'

export type TenantType =
  | 'nomadays_hq'
  | 'dmc'
  | 'agency_b2b'

export type DossierStatus =
  | 'ignored'
  | 'lead'
  | 'quote_in_progress'
  | 'quote_sent'
  | 'negotiation'
  | 'non_reactive'
  | 'option'
  | 'confirmed'
  | 'deposit_paid'
  | 'fully_paid'
  | 'in_trip'
  | 'completed'
  | 'lost'
  | 'cancelled'
  | 'archived'

export type LostReason =
  | 'no_response'
  | 'other_agency'
  | 'changed_destination'
  | 'project_abandoned'
  | 'budget_issue'
  | 'other'

export type MarketingSource =
  | 'organic'
  | 'adwords'
  | 'meta'
  | 'affiliate'
  | 'referral'
  | 'repeat_client'
  | 'partner'
  | 'other'

export type CustomerStatus =
  | 'new_customer'
  | 'returning'
  | 'loyal'

export type TransportType =
  | 'flight'
  | 'train'
  | 'bus'
  | 'car'
  | 'boat'
  | 'other'

export type DossierOrigin =
  | 'website_b2c'
  | 'agency_b2b'
  | 'referral'
  | 'repeat_client'
  | 'other'

export type TripType =
  | 'fit'
  | 'gir'
  | 'group'

export type ServiceType =
  | 'accommodation'
  | 'transport'
  | 'activity'
  | 'guide'
  | 'meal'
  | 'transfer'
  | 'flight'
  | 'insurance'
  | 'visa'
  | 'other'

export type PricingUnit =
  | 'per_person'
  | 'per_group'
  | 'per_room'
  | 'per_vehicle'
  | 'per_day'
  | 'fixed'

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'

export type PaymentStatus =
  | 'pending'
  | 'partial'
  | 'paid'
  | 'refunded'
  | 'failed'

export type PaymentMethod =
  | 'bank_transfer'
  | 'credit_card'
  | 'cash'
  | 'check'
  | 'other'

export type DocumentType =
  | 'proposal_pdf'
  | 'invoice'
  | 'voucher'
  | 'travel_book'
  | 'contract'
  | 'passport_copy'
  | 'other'

export type EventType =
  | 'dossier_created'
  | 'dossier_status_changed'
  | 'proposal_sent'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'payment_received'
  | 'document_uploaded'
  | 'email_sent'
  | 'note_added'
  | 'task_created'
  | 'task_completed'
  | 'participant_added'
  | 'participant_removed'
  | 'circuit_modified'
  | 'price_updated'
  | 'dmc_assigned'
  | 'advisor_assigned'
  | 'custom'

export type TaskPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type AiSuggestionType =
  | 'circuit_optimization'
  | 'pricing_adjustment'
  | 'upsell'
  | 'schedule_conflict'
  | 'followup_reminder'
  | 'other'

export type EmailStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed'

// ============================================================
// DATABASE TYPES
// ============================================================
export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          type: TenantType
          name: string
          legal_name: string | null
          slug: string
          country_code: string | null
          currency: string
          timezone: string
          logo_url: string | null
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: TenantType
          name: string
          legal_name?: string | null
          slug: string
          country_code?: string | null
          currency?: string
          timezone?: string
          logo_url?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: TenantType
          name?: string
          legal_name?: string | null
          slug?: string
          country_code?: string | null
          currency?: string
          timezone?: string
          logo_url?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          tenant_id: string | null
          email: string
          role: UserRole
          first_name: string | null
          last_name: string | null
          phone: string | null
          avatar_url: string | null
          preferences: Json
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id?: string | null
          email: string
          role: UserRole
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          preferences?: Json
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          email?: string
          role?: UserRole
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          preferences?: Json
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_tenant_access: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          granted_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          granted_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          granted_by?: string | null
          created_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          user_id: string | null
          email: string
          first_name: string
          last_name: string
          phone: string | null
          birth_date: string | null
          nationality: string | null
          passport_number: string | null
          passport_expiry: string | null
          dietary_requirements: string | null
          medical_notes: string | null
          emergency_contact: Json | null
          notes: string | null
          customer_status: CustomerStatus
          confirmed_trips_count: number
          first_trip_date: string | null
          last_trip_date: string | null
          total_spent: number
          preferred_language: string
          has_portal_access: boolean
          portal_invited_at: string | null
          portal_last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          email: string
          first_name: string
          last_name: string
          phone?: string | null
          birth_date?: string | null
          nationality?: string | null
          passport_number?: string | null
          passport_expiry?: string | null
          dietary_requirements?: string | null
          medical_notes?: string | null
          emergency_contact?: Json | null
          notes?: string | null
          customer_status?: CustomerStatus
          confirmed_trips_count?: number
          first_trip_date?: string | null
          last_trip_date?: string | null
          total_spent?: number
          preferred_language?: string
          has_portal_access?: boolean
          portal_invited_at?: string | null
          portal_last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          birth_date?: string | null
          nationality?: string | null
          passport_number?: string | null
          passport_expiry?: string | null
          dietary_requirements?: string | null
          medical_notes?: string | null
          emergency_contact?: Json | null
          notes?: string | null
          customer_status?: CustomerStatus
          confirmed_trips_count?: number
          first_trip_date?: string | null
          last_trip_date?: string | null
          total_spent?: number
          preferred_language?: string
          has_portal_access?: boolean
          portal_invited_at?: string | null
          portal_last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      dossiers: {
        Row: {
          id: string
          reference: string
          tenant_id: string
          dmc_id: string | null
          advisor_id: string | null
          status: DossierStatus
          origin: DossierOrigin
          trip_type: TripType
          title: string
          destination_countries: string[]
          departure_date_from: string | null
          departure_date_to: string | null
          duration_days: number | null
          flexibility_days: number
          pax_adults: number
          pax_children: number
          pax_infants: number
          budget_min: number | null
          budget_max: number | null
          budget_currency: string
          client_notes: string | null
          internal_notes: string | null
          tags: string[]
          metadata: Json
          gir_parent_id: string | null
          is_hot: boolean
          language: string
          marketing_source: MarketingSource
          affiliate_name: string | null
          lost_reason: LostReason | null
          lost_notes: string | null
          last_activity_at: string
          source_circuit_id: string | null
          source_gir_departure_date: string | null
          source_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reference?: string
          tenant_id: string
          dmc_id?: string | null
          advisor_id?: string | null
          status?: DossierStatus
          origin?: DossierOrigin
          trip_type?: TripType
          title: string
          destination_countries?: string[]
          departure_date_from?: string | null
          departure_date_to?: string | null
          duration_days?: number | null
          flexibility_days?: number
          pax_adults?: number
          pax_children?: number
          pax_infants?: number
          budget_min?: number | null
          budget_max?: number | null
          budget_currency?: string
          client_notes?: string | null
          internal_notes?: string | null
          tags?: string[]
          metadata?: Json
          gir_parent_id?: string | null
          is_hot?: boolean
          language?: string
          marketing_source?: MarketingSource
          affiliate_name?: string | null
          lost_reason?: LostReason | null
          lost_notes?: string | null
          last_activity_at?: string
          source_circuit_id?: string | null
          source_gir_departure_date?: string | null
          source_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reference?: string
          tenant_id?: string
          dmc_id?: string | null
          advisor_id?: string | null
          status?: DossierStatus
          origin?: DossierOrigin
          trip_type?: TripType
          title?: string
          destination_countries?: string[]
          departure_date_from?: string | null
          departure_date_to?: string | null
          duration_days?: number | null
          flexibility_days?: number
          pax_adults?: number
          pax_children?: number
          pax_infants?: number
          budget_min?: number | null
          budget_max?: number | null
          budget_currency?: string
          client_notes?: string | null
          internal_notes?: string | null
          tags?: string[]
          metadata?: Json
          gir_parent_id?: string | null
          is_hot?: boolean
          language?: string
          marketing_source?: MarketingSource
          affiliate_name?: string | null
          lost_reason?: LostReason | null
          lost_notes?: string | null
          last_activity_at?: string
          source_circuit_id?: string | null
          source_gir_departure_date?: string | null
          source_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      dossier_participants: {
        Row: {
          id: string
          dossier_id: string
          participant_id: string
          is_lead: boolean
          room_preference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          dossier_id: string
          participant_id: string
          is_lead?: boolean
          room_preference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          dossier_id?: string
          participant_id?: string
          is_lead?: boolean
          room_preference?: string | null
          created_at?: string
        }
      }
      trip_offers: {
        Row: {
          id: string
          dossier_id: string
          circuit_id: string | null
          title: string
          description: string | null
          version: number
          status: ProposalStatus
          price_per_person: number | null
          total_price: number | null
          currency: string
          departure_date: string | null
          return_date: string | null
          duration_days: number | null
          sent_at: string | null
          viewed_at: string | null
          accepted_at: string | null
          rejected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dossier_id: string
          circuit_id?: string | null
          title: string
          description?: string | null
          version?: number
          status?: ProposalStatus
          price_per_person?: number | null
          total_price?: number | null
          currency?: string
          departure_date?: string | null
          return_date?: string | null
          duration_days?: number | null
          sent_at?: string | null
          viewed_at?: string | null
          accepted_at?: string | null
          rejected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dossier_id?: string
          circuit_id?: string | null
          title?: string
          description?: string | null
          version?: number
          status?: ProposalStatus
          price_per_person?: number | null
          total_price?: number | null
          currency?: string
          departure_date?: string | null
          return_date?: string | null
          duration_days?: number | null
          sent_at?: string | null
          viewed_at?: string | null
          accepted_at?: string | null
          rejected_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      circuits: {
        Row: {
          id: string
          tenant_id: string
          name: string
          slug: string
          description: string | null
          description_html: string | null
          duration_days: number
          countries: string[]
          highlights: string[]
          included: string[]
          excluded: string[]
          cover_image_url: string | null
          gallery_urls: string[]
          is_template: boolean
          is_published: boolean
          base_price_from: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          slug: string
          description?: string | null
          description_html?: string | null
          duration_days: number
          countries?: string[]
          highlights?: string[]
          included?: string[]
          excluded?: string[]
          cover_image_url?: string | null
          gallery_urls?: string[]
          is_template?: boolean
          is_published?: boolean
          base_price_from?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          slug?: string
          description?: string | null
          description_html?: string | null
          duration_days?: number
          countries?: string[]
          highlights?: string[]
          included?: string[]
          excluded?: string[]
          cover_image_url?: string | null
          gallery_urls?: string[]
          is_template?: boolean
          is_published?: boolean
          base_price_from?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      circuit_elements: {
        Row: {
          id: string
          circuit_id: string
          day_number: number
          position: number
          title: string
          location: string | null
          description: string | null
          description_html: string | null
          coordinates: unknown | null
          overnight_location: string | null
          meals_included: string[]
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          circuit_id: string
          day_number: number
          position?: number
          title: string
          location?: string | null
          description?: string | null
          description_html?: string | null
          coordinates?: unknown | null
          overnight_location?: string | null
          meals_included?: string[]
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          circuit_id?: string
          day_number?: number
          position?: number
          title?: string
          location?: string | null
          description?: string | null
          description_html?: string | null
          coordinates?: unknown | null
          overnight_location?: string | null
          meals_included?: string[]
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      circuit_items: {
        Row: {
          id: string
          circuit_id: string
          element_id: string | null
          service_type: ServiceType
          name: string
          description: string | null
          supplier_name: string | null
          supplier_ref: string | null
          quantity: number
          pricing_unit: PricingUnit
          is_optional: boolean
          is_visible_to_client: boolean
          position: number
          notes_internal: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          circuit_id: string
          element_id?: string | null
          service_type: ServiceType
          name: string
          description?: string | null
          supplier_name?: string | null
          supplier_ref?: string | null
          quantity?: number
          pricing_unit?: PricingUnit
          is_optional?: boolean
          is_visible_to_client?: boolean
          position?: number
          notes_internal?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          circuit_id?: string
          element_id?: string | null
          service_type?: ServiceType
          name?: string
          description?: string | null
          supplier_name?: string | null
          supplier_ref?: string | null
          quantity?: number
          pricing_unit?: PricingUnit
          is_optional?: boolean
          is_visible_to_client?: boolean
          position?: number
          notes_internal?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      circuit_item_seasons: {
        Row: {
          id: string
          item_id: string
          season_name: string
          valid_from: string
          valid_to: string
          pax_min: number
          pax_max: number
          cost_unit: number
          cost_currency: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          season_name?: string
          valid_from: string
          valid_to: string
          pax_min?: number
          pax_max?: number
          cost_unit: number
          cost_currency?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          season_name?: string
          valid_from?: string
          valid_to?: string
          pax_min?: number
          pax_max?: number
          cost_unit?: number
          cost_currency?: string
          notes?: string | null
          created_at?: string
        }
      }
      circuit_versions: {
        Row: {
          id: string
          circuit_id: string
          version_number: number
          snapshot: Json
          change_summary: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          circuit_id: string
          version_number: number
          snapshot: Json
          change_summary?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          circuit_id?: string
          version_number?: number
          snapshot?: Json
          change_summary?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          tenant_id: string
          service_type: ServiceType
          name: string
          description: string | null
          supplier_name: string | null
          location: string | null
          country_code: string | null
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          service_type: ServiceType
          name: string
          description?: string | null
          supplier_name?: string | null
          location?: string | null
          country_code?: string | null
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          service_type?: ServiceType
          name?: string
          description?: string | null
          supplier_name?: string | null
          location?: string | null
          country_code?: string | null
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      service_tariffs: {
        Row: {
          id: string
          service_id: string
          tenant_id: string
          season_name: string
          valid_from: string
          valid_to: string
          pax_min: number
          pax_max: number
          pricing_unit: PricingUnit
          cost_amount: number
          cost_currency: string
          sell_amount: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_id: string
          tenant_id: string
          season_name?: string
          valid_from: string
          valid_to: string
          pax_min?: number
          pax_max?: number
          pricing_unit?: PricingUnit
          cost_amount: number
          cost_currency?: string
          sell_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          tenant_id?: string
          season_name?: string
          valid_from?: string
          valid_to?: string
          pax_min?: number
          pax_max?: number
          pricing_unit?: PricingUnit
          cost_amount?: number
          cost_currency?: string
          sell_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quotation_grids: {
        Row: {
          id: string
          circuit_id: string
          name: string
          valid_from: string
          valid_to: string
          currency: string
          margin_b2c_percent: number
          margin_b2b_percent: number
          commission_nomadays_percent: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          circuit_id: string
          name: string
          valid_from: string
          valid_to: string
          currency?: string
          margin_b2c_percent?: number
          margin_b2b_percent?: number
          commission_nomadays_percent?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          circuit_id?: string
          name?: string
          valid_from?: string
          valid_to?: string
          currency?: string
          margin_b2c_percent?: number
          margin_b2b_percent?: number
          commission_nomadays_percent?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quotation_grid_lines: {
        Row: {
          id: string
          grid_id: string
          pax_count: number
          total_cost: number
          total_sell_b2c: number
          total_sell_b2b: number
          price_per_person_b2c: number
          price_per_person_b2b: number
          breakdown: Json
          created_at: string
        }
        Insert: {
          id?: string
          grid_id: string
          pax_count: number
          total_cost: number
          total_sell_b2c: number
          total_sell_b2b: number
          price_per_person_b2c: number
          price_per_person_b2b: number
          breakdown?: Json
          created_at?: string
        }
        Update: {
          id?: string
          grid_id?: string
          pax_count?: number
          total_cost?: number
          total_sell_b2c?: number
          total_sell_b2b?: number
          price_per_person_b2c?: number
          price_per_person_b2b?: number
          breakdown?: Json
          created_at?: string
        }
      }
      proposals: {
        Row: {
          id: string
          dossier_id: string
          circuit_id: string | null
          version: number
          status: ProposalStatus
          title: string
          introduction_html: string | null
          conclusion_html: string | null
          total_cost: number
          total_sell: number
          currency: string
          pax_count: number
          price_per_person: number
          validity_date: string | null
          sent_at: string | null
          viewed_at: string | null
          responded_at: string | null
          pdf_url: string | null
          public_token: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dossier_id: string
          circuit_id?: string | null
          version?: number
          status?: ProposalStatus
          title: string
          introduction_html?: string | null
          conclusion_html?: string | null
          total_cost?: number
          total_sell?: number
          currency?: string
          pax_count?: number
          price_per_person?: number
          validity_date?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          responded_at?: string | null
          pdf_url?: string | null
          public_token?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dossier_id?: string
          circuit_id?: string | null
          version?: number
          status?: ProposalStatus
          title?: string
          introduction_html?: string | null
          conclusion_html?: string | null
          total_cost?: number
          total_sell?: number
          currency?: string
          pax_count?: number
          price_per_person?: number
          validity_date?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          responded_at?: string | null
          pdf_url?: string | null
          public_token?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      proposal_lines: {
        Row: {
          id: string
          proposal_id: string
          circuit_item_id: string | null
          day_number: number | null
          service_type: ServiceType
          name: string
          description: string | null
          quantity: number
          unit_price: number
          total_price: number
          is_optional: boolean
          is_included: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          circuit_item_id?: string | null
          day_number?: number | null
          service_type: ServiceType
          name: string
          description?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          is_optional?: boolean
          is_included?: boolean
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          circuit_item_id?: string | null
          day_number?: number | null
          service_type?: ServiceType
          name?: string
          description?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          is_optional?: boolean
          is_included?: boolean
          position?: number
          created_at?: string
        }
      }
      pricing_snapshots: {
        Row: {
          id: string
          proposal_id: string
          snapshot_type: string
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          snapshot_type: string
          data: Json
          created_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          snapshot_type?: string
          data?: Json
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          dossier_id: string
          proposal_id: string | null
          status: PaymentStatus
          method: PaymentMethod | null
          amount: number
          currency: string
          due_date: string | null
          paid_at: string | null
          reference: string | null
          notes: string | null
          receipt_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dossier_id: string
          proposal_id?: string | null
          status?: PaymentStatus
          method?: PaymentMethod | null
          amount: number
          currency?: string
          due_date?: string | null
          paid_at?: string | null
          reference?: string | null
          notes?: string | null
          receipt_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dossier_id?: string
          proposal_id?: string | null
          status?: PaymentStatus
          method?: PaymentMethod | null
          amount?: number
          currency?: string
          due_date?: string | null
          paid_at?: string | null
          reference?: string | null
          notes?: string | null
          receipt_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          dossier_id: string | null
          proposal_id: string | null
          participant_id: string | null
          type: DocumentType
          name: string
          file_url: string
          file_size: number | null
          mime_type: string | null
          is_client_visible: boolean
          uploaded_by: string | null
          created_at: string
          price_total: number | null
          price_per_person: number | null
          currency: string
          published_at: string | null
          published_by: string | null
        }
        Insert: {
          id?: string
          dossier_id?: string | null
          proposal_id?: string | null
          participant_id?: string | null
          type: DocumentType
          name: string
          file_url: string
          file_size?: number | null
          mime_type?: string | null
          is_client_visible?: boolean
          uploaded_by?: string | null
          created_at?: string
          price_total?: number | null
          price_per_person?: number | null
          currency?: string
          published_at?: string | null
          published_by?: string | null
        }
        Update: {
          id?: string
          dossier_id?: string | null
          proposal_id?: string | null
          participant_id?: string | null
          type?: DocumentType
          name?: string
          file_url?: string
          file_size?: number | null
          mime_type?: string | null
          is_client_visible?: boolean
          uploaded_by?: string | null
          created_at?: string
          price_total?: number | null
          price_per_person?: number | null
          currency?: string
          published_at?: string | null
          published_by?: string | null
        }
      }
      events: {
        Row: {
          id: string
          tenant_id: string
          dossier_id: string | null
          event_type: EventType
          actor_id: string | null
          actor_email: string | null
          target_type: string | null
          target_id: string | null
          payload: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          dossier_id?: string | null
          event_type: EventType
          actor_id?: string | null
          actor_email?: string | null
          target_type?: string | null
          target_id?: string | null
          payload?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          dossier_id?: string | null
          event_type?: EventType
          actor_id?: string | null
          actor_email?: string | null
          target_type?: string | null
          target_id?: string | null
          payload?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          tenant_id: string
          dossier_id: string | null
          assignee_id: string | null
          title: string
          description: string | null
          priority: TaskPriority
          status: TaskStatus
          due_date: string | null
          completed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          dossier_id?: string | null
          assignee_id?: string | null
          title: string
          description?: string | null
          priority?: TaskPriority
          status?: TaskStatus
          due_date?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          dossier_id?: string | null
          assignee_id?: string | null
          title?: string
          description?: string | null
          priority?: TaskPriority
          status?: TaskStatus
          due_date?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_suggestions: {
        Row: {
          id: string
          tenant_id: string
          dossier_id: string | null
          user_id: string | null
          suggestion_type: AiSuggestionType
          title: string
          content: string
          confidence_score: number | null
          context: Json
          is_dismissed: boolean
          is_applied: boolean
          applied_at: string | null
          feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          dossier_id?: string | null
          user_id?: string | null
          suggestion_type: AiSuggestionType
          title: string
          content: string
          confidence_score?: number | null
          context?: Json
          is_dismissed?: boolean
          is_applied?: boolean
          applied_at?: string | null
          feedback?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          dossier_id?: string | null
          user_id?: string | null
          suggestion_type?: AiSuggestionType
          title?: string
          content?: string
          confidence_score?: number | null
          context?: Json
          is_dismissed?: boolean
          is_applied?: boolean
          applied_at?: string | null
          feedback?: string | null
          created_at?: string
        }
      }
      email_templates: {
        Row: {
          id: string
          tenant_id: string | null
          slug: string
          name: string
          subject: string
          body_html: string
          body_text: string | null
          variables: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          slug: string
          name: string
          subject: string
          body_html: string
          body_text?: string | null
          variables?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          slug?: string
          name?: string
          subject?: string
          body_html?: string
          body_text?: string | null
          variables?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      email_sends: {
        Row: {
          id: string
          template_id: string | null
          dossier_id: string | null
          from_email: string
          to_emails: string[]
          cc_emails: string[]
          bcc_emails: string[]
          subject: string
          body_html: string
          status: EmailStatus
          resend_id: string | null
          opened_at: string | null
          clicked_at: string | null
          error_message: string | null
          sent_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          dossier_id?: string | null
          from_email: string
          to_emails: string[]
          cc_emails?: string[]
          bcc_emails?: string[]
          subject: string
          body_html: string
          status?: EmailStatus
          resend_id?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          error_message?: string | null
          sent_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string | null
          dossier_id?: string | null
          from_email?: string
          to_emails?: string[]
          cc_emails?: string[]
          bcc_emails?: string[]
          subject?: string
          body_html?: string
          status?: EmailStatus
          resend_id?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          error_message?: string | null
          sent_by?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      v_pipeline: {
        Row: {
          id: string | null
          reference: string | null
          title: string | null
          status: DossierStatus | null
          tenant_id: string | null
          dmc_id: string | null
          advisor_id: string | null
          departure_date_from: string | null
          total_pax: number | null
          days_until_departure: number | null
          created_at: string | null
          updated_at: string | null
        }
      }
    }
    Functions: {
      get_user_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      get_user_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
      is_nomadays_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_nomadays_staff: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_dmc_staff: {
        Args: Record<string, never>
        Returns: boolean
      }
      belongs_to_tenant: {
        Args: { check_tenant_id: string }
        Returns: boolean
      }
      can_see_costs: {
        Args: { check_tenant_id: string }
        Returns: boolean
      }
      can_access_dossier: {
        Args: { check_dossier_id: string }
        Returns: boolean
      }
      emit_event: {
        Args: {
          p_tenant_id: string
          p_event_type: EventType
          p_dossier_id?: string
          p_target_type?: string
          p_target_id?: string
          p_payload?: Json
        }
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      tenant_type: TenantType
      dossier_status: DossierStatus
      dossier_origin: DossierOrigin
      trip_type: TripType
      service_type: ServiceType
      pricing_unit: PricingUnit
      proposal_status: ProposalStatus
      payment_status: PaymentStatus
      payment_method: PaymentMethod
      document_type: DocumentType
      event_type: EventType
      task_priority: TaskPriority
      task_status: TaskStatus
      ai_suggestion_type: AiSuggestionType
      email_status: EmailStatus
    }
  }
}

// ============================================================
// HELPER TYPES
// ============================================================
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Shortcuts
export type Tenant = Tables<'tenants'>
export type User = Tables<'users'>
export type Participant = Tables<'participants'>
export type Dossier = Tables<'dossiers'>
export type DossierParticipant = Tables<'dossier_participants'>
export type Circuit = Tables<'circuits'>
export type CircuitElement = Tables<'circuit_elements'>
export type CircuitItem = Tables<'circuit_items'>
export type CircuitItemSeason = Tables<'circuit_item_seasons'>
export type Service = Tables<'services'>
export type ServiceTariff = Tables<'service_tariffs'>
export type QuotationGrid = Tables<'quotation_grids'>
export type QuotationGridLine = Tables<'quotation_grid_lines'>
export type Proposal = Tables<'proposals'>
export type ProposalLine = Tables<'proposal_lines'>
export type Payment = Tables<'payments'>
export type Document = Tables<'documents'>
export type Event = Tables<'events'>
export type Task = Tables<'tasks'>
export type AiSuggestion = Tables<'ai_suggestions'>
export type EmailTemplate = Tables<'email_templates'>
export type EmailSend = Tables<'email_sends'>
