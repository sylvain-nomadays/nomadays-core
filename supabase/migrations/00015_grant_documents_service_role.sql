-- Grant service_role permissions on documents table
-- Required for server-side uploads (PDF proposals, etc.)
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO service_role;

-- Also grant to authenticated role for RLS-based reads
GRANT SELECT ON documents TO authenticated;
