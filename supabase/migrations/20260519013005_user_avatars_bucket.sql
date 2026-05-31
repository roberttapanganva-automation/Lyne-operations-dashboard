insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'user-avatars',
  'user-avatars',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read user avatars"
on storage.objects;

drop policy if exists "Users can upload own avatar"
on storage.objects;

drop policy if exists "Users can update own avatar"
on storage.objects;

drop policy if exists "Users can delete own avatar"
on storage.objects;

create policy "Authenticated users can read user avatars"
on storage.objects
for select
to authenticated
using (bucket_id = 'user-avatars');

create policy "Users can upload own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'user-avatars'
  and array_length(storage.foldername(name), 1) >= 1
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'user-avatars'
  and array_length(storage.foldername(name), 1) >= 1
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'user-avatars'
  and array_length(storage.foldername(name), 1) >= 1
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'user-avatars'
  and array_length(storage.foldername(name), 1) >= 1
  and (storage.foldername(name))[1] = auth.uid()::text
);
