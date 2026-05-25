-- OX Quiz App schema (migrated from gaegyeobu / mbjktacmubqvpraiigzb)

CREATE OR REPLACE FUNCTION public.ox_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.ox_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.ox_profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.ox_profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.ox_profiles.avatar_url),
    updated_at = now();

  insert into public.ox_user_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$function$;

CREATE TABLE public.ox_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,
  community_nickname text NOT NULL DEFAULT '익명',
  appearance_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ox_user_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ox_community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  nickname text NOT NULL DEFAULT '익명',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ox_item_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  exam_id text NOT NULL,
  item_key text NOT NULL,
  pick text NOT NULL CHECK (pick = ANY (ARRAY['O'::text, 'X'::text])),
  correct boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ox_community_posts_created_at_idx ON public.ox_community_posts (created_at DESC);
CREATE INDEX ox_item_attempts_user_exam_idx ON public.ox_item_attempts (user_id, exam_id, attempted_at DESC);

CREATE TRIGGER ox_profiles_updated_at
  BEFORE UPDATE ON public.ox_profiles
  FOR EACH ROW EXECUTE FUNCTION ox_set_updated_at();

CREATE TRIGGER ox_user_state_updated_at
  BEFORE UPDATE ON public.ox_user_state
  FOR EACH ROW EXECUTE FUNCTION ox_set_updated_at();

CREATE TRIGGER on_auth_user_created_ox_quiz
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION ox_handle_new_user();

ALTER TABLE public.ox_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ox_user_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ox_community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ox_item_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY ox_profiles_select_own ON public.ox_profiles
  FOR SELECT TO public USING (auth.uid() = id);

CREATE POLICY ox_profiles_update_own ON public.ox_profiles
  FOR UPDATE TO public USING (auth.uid() = id);

CREATE POLICY ox_user_state_select_own ON public.ox_user_state
  FOR SELECT TO public USING (auth.uid() = user_id);

CREATE POLICY ox_user_state_insert_own ON public.ox_user_state
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

CREATE POLICY ox_user_state_update_own ON public.ox_user_state
  FOR UPDATE TO public USING (auth.uid() = user_id);

CREATE POLICY ox_community_posts_select_auth ON public.ox_community_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ox_community_posts_insert_own ON public.ox_community_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY ox_community_posts_delete_own ON public.ox_community_posts
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY ox_item_attempts_select_own ON public.ox_item_attempts
  FOR SELECT TO public USING (auth.uid() = user_id);

CREATE POLICY ox_item_attempts_insert_own ON public.ox_item_attempts
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

CREATE POLICY ox_item_attempts_delete_own ON public.ox_item_attempts
  FOR DELETE TO public USING (auth.uid() = user_id);
