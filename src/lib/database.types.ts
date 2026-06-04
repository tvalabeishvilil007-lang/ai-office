// ─────────────────────────────────────────────────────────────────────────────
// Supabase database type definitions.
// Auto-generated format — keep in sync with your Supabase schema.
// ─────────────────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          agent_id: string;
          title: string;
          preview: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_id: string;
          title?: string;
          preview?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          preview?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'agent';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: 'user' | 'agent';
          content: string;
          created_at?: string;
        };
        Update: never;
      };
    };
  };
}
