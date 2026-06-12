import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing! Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set in your .env.local file.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export interface Category {
  id: string;
  name: string;
  created_at: string;
  flashcard_count?: number;
}

export interface Flashcard {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  last_rating: number | null;
  created_at: string;
  is_memorizer: boolean;
}

export interface Review {
  id: string;
  flashcard_id: string;
  rating: number;
  created_at: string;
}
