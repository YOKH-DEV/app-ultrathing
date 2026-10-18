// Tipos del esquema de Supabase (public). Reflejan supabase/migrations/0001_init.sql.
// Regenerar desde el proyecto remoto con: pnpm db:types (requiere `supabase login`).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          user_id: string;
          module: string;
          status: string;
          progress: number;
          result: Json | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          module: string;
          status?: string;
          progress?: number;
          result?: Json | null;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          module?: string;
          status?: string;
          progress?: number;
          result?: Json | null;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'jobs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      downloads: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          filepath: string;
          ext: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          filepath: string;
          ext: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          filepath?: string;
          ext?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'downloads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          name: string | null;
          phone: string | null;
          email: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      designs: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          width: number;
          height: number;
          background: Json;
          elements: Json;
          thumbnail: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          width: number;
          height: number;
          background?: Json;
          elements?: Json;
          thumbnail?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          width?: number;
          height?: number;
          background?: Json;
          elements?: Json;
          thumbnail?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'designs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
