-- Adiciona coluna de notas de rodapé nos capítulos
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS footnotes jsonb DEFAULT '[]'::jsonb;
