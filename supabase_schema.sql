-- Supabase schema setup for Flashcards application
-- Run this in your Supabase SQL Editor to set up the tables!

-- Create categories table
create table if not exists fc_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create flashcards table
create table if not exists fc_flashcards (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references fc_categories(id) on delete cascade not null,
  question text not null,
  answer text not null,
  last_rating int, -- Stores latest user rating (1-5)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create reviews history table
create table if not exists fc_reviews (
  id uuid default gen_random_uuid() primary key,
  flashcard_id uuid references fc_flashcards(id) on delete cascade not null,
  rating int check (rating >= 1 and rating <= 5) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable full read/write access for anyone (anon access) for easy prototyping/standalone usage.
-- We can set up permissive RLS policies if RLS is enabled:
alter table fc_categories enable row level security;
alter table fc_flashcards enable row level security;
alter table fc_reviews enable row level security;

create policy "Allow public read access on fc_categories" on fc_categories for select using (true);
create policy "Allow public insert access on fc_categories" on fc_categories for insert with check (true);
create policy "Allow public update access on fc_categories" on fc_categories for update using (true);
create policy "Allow public delete access on fc_categories" on fc_categories for delete using (true);

create policy "Allow public read access on fc_flashcards" on fc_flashcards for select using (true);
create policy "Allow public insert access on fc_flashcards" on fc_flashcards for insert with check (true);
create policy "Allow public update access on fc_flashcards" on fc_flashcards for update using (true);
create policy "Allow public delete access on fc_flashcards" on fc_flashcards for delete using (true);

create policy "Allow public read access on fc_reviews" on fc_reviews for select using (true);
create policy "Allow public insert access on fc_reviews" on fc_reviews for insert with check (true);
create policy "Allow public update access on fc_reviews" on fc_reviews for update using (true);
create policy "Allow public delete access on fc_reviews" on fc_reviews for delete using (true);
