/*
# Lock down client writes to data tables

The original schema let anon/authenticated INSERT, UPDATE and DELETE any row in
`documents`, `searches` and `line_embeddings`, so anyone holding the public
anon key could overwrite or delete any document.

1. Policies
- Drop every anon/authenticated (and PUBLIC) INSERT, UPDATE, DELETE and ALL
  policy on `documents`, `searches` and `line_embeddings`, including any that
  were added outside the original migration.
- Keep (re-assert) the anon/authenticated SELECT policies so history and
  stats still load in the browser.

2. Grants
- Revoke INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER on these
  tables from anon and authenticated, as defence in depth. SELECT stays.

3. Writes now go through the `persist` edge function (service role,
  insert-only, size-limited). Nothing in the client writes `line_embeddings`,
  so its write policies are dropped without a replacement.
*/

DROP POLICY IF EXISTS "anon_insert_documents" ON public.documents;
DROP POLICY IF EXISTS "anon_update_documents" ON public.documents;
DROP POLICY IF EXISTS "anon_delete_documents" ON public.documents;

DROP POLICY IF EXISTS "anon_insert_searches" ON public.searches;
DROP POLICY IF EXISTS "anon_update_searches" ON public.searches;
DROP POLICY IF EXISTS "anon_delete_searches" ON public.searches;

DROP POLICY IF EXISTS "anon_insert_embeddings" ON public.line_embeddings;
DROP POLICY IF EXISTS "anon_update_embeddings" ON public.line_embeddings;
DROP POLICY IF EXISTS "anon_delete_embeddings" ON public.line_embeddings;

-- Sweep up any other write policies for client roles on these tables.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('documents', 'searches', 'line_embeddings')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND roles && ARRAY['anon', 'authenticated', 'public']::name[]
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Anon keeps read access.
DROP POLICY IF EXISTS "anon_select_documents" ON public.documents;
CREATE POLICY "anon_select_documents" ON public.documents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_searches" ON public.searches;
CREATE POLICY "anon_select_searches" ON public.searches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_embeddings" ON public.line_embeddings;
CREATE POLICY "anon_select_embeddings" ON public.line_embeddings FOR SELECT
  TO anon, authenticated USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.documents, public.searches, public.line_embeddings
  FROM anon, authenticated;

GRANT SELECT ON public.documents, public.searches, public.line_embeddings
  TO anon, authenticated;
