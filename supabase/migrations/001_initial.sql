-- ============================================================
-- Libretto — Schema inicial
-- ============================================================

-- Habilita extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────
-- Extende auth.users com dados do plano e perfil
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  avatar_url  TEXT,
  plan        TEXT NOT NULL DEFAULT 'rascunho' CHECK (plan IN ('rascunho', 'escritor', 'publisher')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprio perfil"    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuário atualiza próprio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ── Books ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  author           TEXT NOT NULL DEFAULT '',
  format           TEXT NOT NULL DEFAULT '14x21'
                     CHECK (format IN ('14x21','15x23','a5','pocket','abnt')),
  language         TEXT NOT NULL DEFAULT 'pt-BR',
  cover_url        TEXT,
  word_count       INTEGER NOT NULL DEFAULT 0,
  daily_goal       INTEGER NOT NULL DEFAULT 500,
  streak           INTEGER NOT NULL DEFAULT 0,
  last_written_at  TIMESTAMPTZ,
  -- Publicação
  category         TEXT CHECK (category IN ('ficcao','nao-ficcao','academico','infantojuvenil','poesia')),
  subcategory      TEXT,
  synopsis         TEXT,
  keywords         TEXT[] DEFAULT '{}',
  price            NUMERIC(10,2),
  territory        TEXT DEFAULT 'brasil' CHECK (territory IN ('brasil','mundial')),
  status           TEXT NOT NULL DEFAULT 'escrevendo'
                     CHECK (status IN ('escrevendo','revisao','publicado')),
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprios livros"    ON books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário cria próprios livros"  ON books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza próprios livros" ON books FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário apaga próprios livros" ON books FOR DELETE USING (auth.uid() = user_id);

-- ── Chapters ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id                 UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL DEFAULT 'Sem título',
  "order"                 INTEGER NOT NULL DEFAULT 0,
  content                 JSONB DEFAULT '{}',     -- TipTap JSON (para recarregar no editor)
  content_html            TEXT DEFAULT '',        -- HTML (para preview e API)
  word_count              INTEGER NOT NULL DEFAULT 0,
  opening_style           TEXT DEFAULT 'nenhum'
                            CHECK (opening_style IN ('nenhum','simples','epigrafe','ilustrado','pagina-inteira')),
  opening_image           TEXT,                   -- base64 ou URL do Storage
  opening_epigraph        TEXT,
  opening_epigraph_author TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprios capítulos"    ON chapters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário cria próprios capítulos"  ON chapters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza próprios capítulos" ON chapters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuário apaga próprios capítulos" ON chapters FOR DELETE USING (auth.uid() = user_id);

-- ── Writing sessions ──────────────────────────────────────
-- Uma linha por dia por livro — acumula palavras escritas
CREATE TABLE IF NOT EXISTS writing_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id       UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  words_written INTEGER NOT NULL DEFAULT 0,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id, date)
);

ALTER TABLE writing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprias sessões"   ON writing_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário cria próprias sessões" ON writing_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza próprias sessões" ON writing_sessions FOR UPDATE USING (auth.uid() = user_id);

-- ── Triggers: updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER chapters_updated_at
  BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Trigger: cria perfil ao cadastrar ─────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Índices ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_books_user_id       ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_updated_at    ON books(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapters_book_id    ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order      ON chapters(book_id, "order");
CREATE INDEX IF NOT EXISTS idx_sessions_user_date  ON writing_sessions(user_id, date DESC);
