/*
# Ctrl+F for Meaning — schema

1. New Tables
- `documents`: stores loaded documents with their tagged lines and section outline.
  - `id` uuid PK
  - `title` text
  - `source` text (sample id | paste | upload filename)
  - `is_sample` boolean
  - `line_count` int
  - `token_estimate` int
  - `lines` jsonb (array of {id, text})
  - `sections` jsonb (array of {id, heading, startLine, endLine})
  - `created_at` timestamptz
- `searches`: stores search results for stats and replay.
  - `id` uuid PK
  - `document_id` uuid FK → documents.id ON DELETE CASCADE
  - `query` text
  - `mode` text (single | two_pass | replay | fallback)
  - `exists_p` numeric
  - `verdict` text
  - `top_lines` jsonb
  - `jev_requests` jsonb
  - `jev_responses` jsonb
  - `model` text
  - `latency_ms` int
  - `input_tokens` int
  - `cost_usd` numeric
  - `answer` text
  - `writer_mode` text
  - `baseline` jsonb
  - `created_at` timestamptz
- `line_embeddings`: caches embeddings per document+model.
  - `document_id` uuid FK → documents.id ON DELETE CASCADE
  - `line_id` text
  - `model` text
  - `embedding` float4[]
  - PRIMARY KEY (document_id, line_id, model)

2. Security
- Enable RLS on all tables.
- Permissive anon+authenticated policies (single public demo workspace, no auth).
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source text NOT NULL DEFAULT 'paste',
  is_sample boolean NOT NULL DEFAULT false,
  line_count int NOT NULL DEFAULT 0,
  token_estimate int NOT NULL DEFAULT 0,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_documents" ON documents;
CREATE POLICY "anon_select_documents" ON documents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_documents" ON documents;
CREATE POLICY "anon_insert_documents" ON documents FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_documents" ON documents;
CREATE POLICY "anon_update_documents" ON documents FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_documents" ON documents;
CREATE POLICY "anon_delete_documents" ON documents FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  query text NOT NULL,
  mode text NOT NULL DEFAULT 'single',
  exists_p numeric NOT NULL DEFAULT 0,
  verdict text NOT NULL DEFAULT 'not_in_document',
  top_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  jev_requests jsonb NOT NULL DEFAULT '[]'::jsonb,
  jev_responses jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  latency_ms int NOT NULL DEFAULT 0,
  input_tokens int NOT NULL DEFAULT 0,
  cost_usd numeric NOT NULL DEFAULT 0,
  answer text,
  writer_mode text NOT NULL DEFAULT 'live',
  baseline jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_searches" ON searches;
CREATE POLICY "anon_select_searches" ON searches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_searches" ON searches;
CREATE POLICY "anon_insert_searches" ON searches FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_searches" ON searches;
CREATE POLICY "anon_update_searches" ON searches FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_searches" ON searches;
CREATE POLICY "anon_delete_searches" ON searches FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS line_embeddings (
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  line_id text NOT NULL,
  model text NOT NULL,
  embedding float4[] NOT NULL,
  PRIMARY KEY (document_id, line_id, model)
);

ALTER TABLE line_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_embeddings" ON line_embeddings;
CREATE POLICY "anon_select_embeddings" ON line_embeddings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_embeddings" ON line_embeddings;
CREATE POLICY "anon_insert_embeddings" ON line_embeddings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_embeddings" ON line_embeddings;
CREATE POLICY "anon_update_embeddings" ON line_embeddings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_embeddings" ON line_embeddings;
CREATE POLICY "anon_delete_embeddings" ON line_embeddings FOR DELETE
  TO anon, authenticated USING (true);
