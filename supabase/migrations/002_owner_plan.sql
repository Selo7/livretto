-- Garante plano publisher para o dono da plataforma no cadastro
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, plan)
  VALUES (
    new.id,
    CASE
      WHEN new.email = 'brunobrm@gmail.com' THEN 'publisher'
      ELSE 'rascunho'
    END
  );
  RETURN new;
END;
$$;

-- Caso a conta já exista (criada antes desta migration)
UPDATE public.profiles
SET plan = 'publisher'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'brunobrm@gmail.com'
);
