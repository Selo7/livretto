-- Adiciona o formato 'kdp' (5.5" × 8.5" — padrão Amazon KDP) à tabela books
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_format_check;
ALTER TABLE books ADD CONSTRAINT books_format_check
  CHECK (format IN ('14x21','15x23','a5','pocket','abnt','kdp'));
