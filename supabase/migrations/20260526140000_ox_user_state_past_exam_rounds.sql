-- 5회독 결과 클라우드 동기화용 필드
ALTER TABLE public.ox_user_state
  ADD COLUMN IF NOT EXISTS past_exam_rounds jsonb NOT NULL DEFAULT '{}'::jsonb;
