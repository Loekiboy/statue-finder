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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      discovered_kunstwerken: {
        Row: {
          city: string
          discovered_at: string
          id: string
          kunstwerk_id: string
          photo_url: string | null
          user_id: string
        }
        Insert: {
          city: string
          discovered_at?: string
          id?: string
          kunstwerk_id: string
          photo_url?: string | null
          user_id: string
        }
        Update: {
          city?: string
          discovered_at?: string
          id?: string
          kunstwerk_id?: string
          photo_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      discovered_models: {
        Row: {
          discovered_at: string
          id: string
          model_id: string
          user_id: string
        }
        Insert: {
          discovered_at?: string
          id?: string
          model_id: string
          user_id: string
        }
        Update: {
          discovered_at?: string
          id?: string
          model_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovered_models_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovered_models_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "public_models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          artist: string | null
          created_at: string
          credits: string | null
          description: string | null
          file_path: string
          id: string
          is_municipal: boolean | null
          latitude: number | null
          longitude: number | null
          materials: string | null
          name: string
          photo_url: string | null
          source_city: string | null
          source_id: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          year: string | null
        }
        Insert: {
          artist?: string | null
          created_at?: string
          credits?: string | null
          description?: string | null
          file_path: string
          id?: string
          is_municipal?: boolean | null
          latitude?: number | null
          longitude?: number | null
          materials?: string | null
          name: string
          photo_url?: string | null
          source_city?: string | null
          source_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          year?: string | null
        }
        Update: {
          artist?: string | null
          created_at?: string
          credits?: string | null
          description?: string | null
          file_path?: string
          id?: string
          is_municipal?: boolean | null
          latitude?: number | null
          longitude?: number | null
          materials?: string | null
          name?: string
          photo_url?: string | null
          source_city?: string | null
          source_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          year?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          language: string
          last_known_latitude: number | null
          last_known_longitude: number | null
          last_location_updated_at: string | null
          show_osm_statues: boolean
          slideshow_enabled: boolean | null
          theme: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          last_known_latitude?: number | null
          last_known_longitude?: number | null
          last_location_updated_at?: string | null
          show_osm_statues?: boolean
          slideshow_enabled?: boolean | null
          theme?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          last_known_latitude?: number | null
          last_known_longitude?: number | null
          last_location_updated_at?: string | null
          show_osm_statues?: boolean
          slideshow_enabled?: boolean | null
          theme?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      public_models: {
        Row: {
          created_at: string | null
          description: string | null
          file_path: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
    Enums: {},
  },
} as const
