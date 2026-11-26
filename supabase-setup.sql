-- ============================================================
-- WINORRA DIGITAL — Supabase Database & Storage Setup
-- Admin-Only Upload + Public Video Viewing
-- Run this in Supabase Dashboard -> SQL Editor -> Click 'Run'
-- ============================================================

-- 1. Create Portfolio Videos Table
create table if not exists public.portfolio_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (category in ('reels', 'cinematic', 'beats', 'design')),
  description text not null default '',
  file_path text not null unique,
  public_url text not null,
  created_by uuid references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

-- 2. Enable Row Level Security (RLS)
alter table public.portfolio_videos enable row level security;

-- 3. Public Viewing: Anyone (Mobile, PC, Clients) can VIEW all videos
grant select on public.portfolio_videos to anon, authenticated;
drop policy if exists "Anyone can view portfolio videos" on public.portfolio_videos;
create policy "Anyone can view portfolio videos"
  on public.portfolio_videos for select
  to anon, authenticated
  using (true);

-- 4. Admin-Only Insert: Only signed-in Admin can add new videos
grant insert on public.portfolio_videos to authenticated;
drop policy if exists "Only admin can add videos" on public.portfolio_videos;
create policy "Only admin can add videos"
  on public.portfolio_videos for insert
  to authenticated
  with check (auth.role() = 'authenticated');

-- 5. Admin-Only Delete: Only signed-in Admin can delete videos
grant delete on public.portfolio_videos to authenticated;
drop policy if exists "Only admin can delete videos" on public.portfolio_videos;
create policy "Only admin can delete videos"
  on public.portfolio_videos for delete
  to authenticated
  using (auth.role() = 'authenticated');

-- 6. Create Public Storage Bucket 'portfolio-videos' (50 MB Limit)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-videos',
  'portfolio-videos',
  true,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime'];

-- 7. Public Storage Viewing: Anyone can stream/play videos
drop policy if exists "Public video streaming" on storage.objects;
create policy "Public video streaming"
  on storage.objects for select
  using (bucket_id = 'portfolio-videos');

-- 8. Admin-Only Storage Upload: Only signed-in Admin can upload video files
drop policy if exists "Admin video upload" on storage.objects;
create policy "Admin video upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'portfolio-videos' and auth.role() = 'authenticated');

-- 9. Admin-Only Storage Delete: Only signed-in Admin can delete video files
drop policy if exists "Admin video delete" on storage.objects;
create policy "Admin video delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'portfolio-videos' and auth.role() = 'authenticated');
