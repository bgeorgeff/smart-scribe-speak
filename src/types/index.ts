import { User as SupabaseUser } from '@supabase/supabase-js';

export type User = SupabaseUser | null;

export interface SavedContent {
  id: string;
  user_id: string;
  topic: string;
  grade_level: string;
  content: string;
  citations: string[] | null;
  font_family: string | null;
  font_size: string | null;
  created_at: string;
  updated_at: string;
}
