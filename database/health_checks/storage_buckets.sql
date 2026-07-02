-- ============================================================
-- Health Check — Storage Buckets
-- Requires the storage schema (Supabase-managed). Run in the SQL Editor,
-- not via a generic Postgres client, since `storage.buckets` is
-- Supabase-specific.
-- ============================================================

SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
ORDER BY name;

-- Policies on storage.objects (bucket-level access rules).
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
