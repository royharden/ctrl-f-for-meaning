/*
# Daily demo cap for paid upstream calls

1. New Tables
- `usage_counters`: per-day call counts for each edge function plus an
  `app_total` row that holds the app-wide count.
  - `fn` text (edge function name, or `app_total`)
  - `day` date (UTC)
  - `calls` int
  - PRIMARY KEY (fn, day)

2. New Functions
- `increment_usage(fn_name text, cap int default 200) returns int`
  Called by edge functions (service role only) before every paid TypeSafe /
  OpenAI fetch. Atomically bumps today's `app_total` row and the row for
  `fn_name`, and returns the new `app_total` count, or -1 once the app-wide
  cap for the day has been reached. The cap is shared by the whole app, not
  per function.

3. Security
- RLS enabled on `usage_counters` with NO policies; all table privileges
  revoked from anon and authenticated. Only `increment_usage` (SECURITY
  DEFINER) touches the table.
- EXECUTE on `increment_usage` is revoked from PUBLIC, anon and authenticated
  and granted only to service_role.
*/

CREATE TABLE IF NOT EXISTS public.usage_counters (
  fn text NOT NULL,
  day date NOT NULL,
  calls int NOT NULL DEFAULT 0,
  PRIMARY KEY (fn, day)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.usage_counters FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_usage(fn_name text, cap int DEFAULT 200)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'utc')::date;
  total int;
BEGIN
  IF fn_name IS NULL OR fn_name = '' OR fn_name = 'app_total' OR length(fn_name) > 64 THEN
    RAISE EXCEPTION 'increment_usage: invalid fn_name';
  END IF;

  IF cap IS NULL OR cap <= 0 THEN
    RETURN -1;
  END IF;

  -- App-wide counter. ON CONFLICT DO UPDATE locks the row, so concurrent
  -- callers are serialised and each sees a distinct count. The WHERE clause
  -- stops counting at the cap: once reached, no row is returned and total
  -- stays NULL.
  INSERT INTO public.usage_counters (fn, day, calls)
  VALUES ('app_total', today, 1)
  ON CONFLICT (fn, day) DO UPDATE
    SET calls = usage_counters.calls + 1
    WHERE usage_counters.calls < cap
  RETURNING calls INTO total;

  IF total IS NULL THEN
    RETURN -1;
  END IF;

  -- Per-function breakdown (only counts calls that were allowed through).
  INSERT INTO public.usage_counters (fn, day, calls)
  VALUES (fn_name, today, 1)
  ON CONFLICT (fn, day) DO UPDATE
    SET calls = usage_counters.calls + 1;

  RETURN total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_usage(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(text, int) TO service_role;
