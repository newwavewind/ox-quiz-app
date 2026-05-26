ALTER TABLE public.ox_profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.ox_profiles_guard_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF auth.uid() = NEW.id THEN
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS ox_profiles_guard_is_admin ON public.ox_profiles;

CREATE TRIGGER ox_profiles_guard_is_admin
  BEFORE UPDATE ON public.ox_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ox_profiles_guard_is_admin();
