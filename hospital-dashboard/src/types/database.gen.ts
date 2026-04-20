/**
 * Tipos base do schema (expandir com `npx supabase gen types typescript --project-id <id>`).
 */
export type Database = {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      }
    >;
    Views: Record<string, never>;
    Functions: {
      [name: string]: { Args: Record<string, unknown>; Returns: unknown };
    };
    Enums: Record<string, never>;
  };
};
