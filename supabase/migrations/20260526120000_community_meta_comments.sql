-- Community post meta (board, likes, polls, etc.) + comments

ALTER TABLE public.ox_community_posts
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.ox_community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.ox_community_posts (id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  nickname text NOT NULL DEFAULT '익명',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ox_community_comments_post_id_idx
  ON public.ox_community_comments (post_id, created_at ASC);

CREATE TRIGGER ox_community_comments_updated_at
  BEFORE UPDATE ON public.ox_community_comments
  FOR EACH ROW EXECUTE FUNCTION ox_set_updated_at();

ALTER TABLE public.ox_community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ox_community_comments_select_auth ON public.ox_community_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ox_community_comments_insert_own ON public.ox_community_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY ox_community_comments_update_own ON public.ox_community_comments
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY ox_community_comments_delete_own ON public.ox_community_comments
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY ox_community_posts_update_meta ON public.ox_community_posts
  FOR UPDATE TO authenticated USING (true);
