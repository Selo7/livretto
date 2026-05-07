# Livretto — Estado do Projeto (07/05/2026)

## O que é

Editor de livros web (livretto.online) voltado para autores brasileiros.
Stack: Next.js 16 · Supabase (auth + DB) · TipTap (editor) · Zustand (estado) · Tailwind.

---

## O que está funcionando (produção)

### Editor
- Escrita com TipTap (negrito, itálico, títulos H1-H3, blockquote, listas)
- Múltiplos capítulos com sidebar lateral arrastável (reordenação por drag-and-drop)
- Autosave por debounce a cada 1 s
- Modo foco (esconde toda a interface)
- Busca e substituição no texto
- Contagem de palavras por capítulo e por sessão

### Capítulos
- Criação, renomeação, exclusão, reordenação
- "Partir capítulo" pelo heading atual (divide em dois capítulos no ponto do cursor)
- Intercapa de capítulo: estilo de abertura (Simples, Epígrafe, Ilustrado, Página inteira), numeração automática ou customizada
- Abertura de capítulo salva no Supabase e sobrevive a reloads

### Notas de rodapé
- Inserção inline `[n]` com painel flutuante de edição
- Numeração global (não reinicia por capítulo)
- Renderizadas corretamente no visualizador e no visualizador flip

### Capa e contracapa
- Upload de capa (frente) e contracapa (verso) separados
- Upload de spread único (frente+verso lado a lado) — o editor divide automaticamente
- Imagens comprimidas no browser antes de salvar
- Persistidas no Supabase (colunas `cover_url` e `back_cover_url`)
- Aparecem como primeira e última página no visualizador

### Visualizador lateral (PagePreview)
- Paginação automática em tempo real por todos os capítulos
- Escala adaptável à viewport
- Destaque do bloco onde o cursor está
- Orphan heading: cabeçalho no fim de página é puxado para a próxima
- Intercapas de capítulo renderizadas antes da primeira página de cada capítulo

### Visualizador Flip (ao clicar em "Finalizar livro")
- Tela cheia com animação 3D de virar página (CSS transform-style: preserve-3d)
- Paginação igual ao visualizador lateral
- Capa, páginas de conteúdo, contracapa, páginas em branco para spread correto
- Navegação por teclado (←/→/Espaço/Esc)
- Botão "Configurar publicação" abre o modal de publicação

### Publicação (FinalizarLivro)
- Modal com campos: categoria, subcategoria, sinopse, palavras-chave, preço, território
- Status do livro (escrevendo / revisão / publicado)

### IA
- Painel lateral com Claude (Anthropic API)
- Transcrição de áudio com Groq Whisper

### Auth
- Login / cadastro / recuperação de senha via Supabase Auth
- Botão de logout no header

### Fonte
- Seleção de fonte do corpo (via ConfiguracaoLivro)
- Fontes customizadas por upload

---

## Migrations SQL pendentes no Supabase

Rodar no SQL Editor do projeto (tjxnyaksufmidvorpbsu.supabase.co):

```sql
-- Colunas da tabela books
ALTER TABLE books ADD COLUMN IF NOT EXISTS back_cover_url text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url text;

-- Colunas da tabela chapters
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS opening_style text;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS opening_image text;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS opening_epigraph text;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS opening_epigraph_author text;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS numbered boolean default true;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS chapter_num text;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS footnotes jsonb;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS content_html text;
```

---

## Bugs conhecidos / limitações atuais

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Imagens de capa salvas como base64 no DB (podem ser grandes) | Se o livro tem imagens muito grandes pode lentificar |
| 2 | Visualizador Flip não renderiza intercapas de capítulo | Só PagePreview mostra as aberturas de capítulo |
| 3 | Clicar no visualizador não navega até o trecho no editor | Feature removida com o toggle capítulo/livro |
| 4 | Export PDF/EPUB não implementado | Modal de publicação é só formulário por ora |
| 5 | Imagens de abertura de capítulo (opening_image) salvas como base64 no localStorage | Mesma limitação das capas |

---

## Roadmap

### MVP (bloqueadores antes do lançamento)

- [ ] **Export PDF** — gerar PDF com toda a formatação do visualizador
- [ ] **Export EPUB** — geração de arquivo EPUB para e-readers
- [ ] **Modo MAPA** — mapa de personagens, lugares, eventos (estrutura já em types/book.ts)
- [ ] **Modo ESTRUTURA** — outline/storyboard do livro
- [ ] **Upload de imagens para Supabase Storage** (em vez de base64 no DB)

### v2

- [ ] Colaboração em tempo real
- [ ] Histórico de versões por capítulo
- [ ] Modelos de livro pré-formatados
- [ ] Índice automático gerado a partir dos headings

### v3

- [ ] Marketplace de livros publicados
- [ ] Dashboard de vendas para autores
- [ ] ISBN e registro

### v4

- [ ] App mobile (leitura)
- [ ] Integração com distribuidoras (Amazon KDP, etc.)

---

## Arquitetura — arquivos chave

```
src/
  app/
    (app)/editor/[bookId]/page.tsx   — página principal do editor
    books/page.tsx                   — lista de livros do usuário
    new/page.tsx                     — onboarding (criar livro)
    auth/login/page.tsx              — autenticação

  components/
    layout/
      Header.tsx                     — barra superior (modos, AI, Finalizar livro, logout)
    editor/
      BookEditor.tsx                 — orquestrador principal (editor TipTap + sidebar)
      PagePreview.tsx                — visualizador lateral com paginação em tempo real
      VisualizadorFlip.tsx           — visualizador flip 3D (ao clicar Finalizar livro)
      ChapterSidebar.tsx             — lista de capítulos + CapaLivro + drag-and-drop
      CapaLivro.tsx                  — upload de capa e contracapa
      IntercapaCapitulo.tsx          — configuração de abertura de capítulo
      FinalizarLivro.tsx             — modal de publicação
      GerenciadorRodape.tsx          — painel de notas de rodapé
      BuscarTexto.tsx                — busca e substituição
      ConfiguracaoLivro.tsx          — configurações de formato e fonte

  lib/
    store/editorStore.ts             — Zustand store (estado global + persist localStorage)
    services/books.ts                — CRUD de livros no Supabase
    services/chapters.ts             — CRUD de capítulos no Supabase
    fonts.ts                         — catálogo de fontes disponíveis

  types/
    book.ts                          — todos os types (Book, Chapter, etc.)

  app/globals.css                    — CSS global incluindo animações flip e book-page-content
```

---

## Ambiente e deploy

- **Produção:** livretto.online (Hostinger, domínio válido até 2026-05-06 — renovar!)
- **Repositório:** https://github.com/Selo7/livretto
- **Supabase:** https://tjxnyaksufmidvorpbsu.supabase.co
- **Deploy:** push para `master` → Hostinger puxa automaticamente

### Variáveis de ambiente (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://tjxnyaksufmidvorpbsu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
GROQ_API_KEY=gsk_...
ANTHROPIC_API_KEY=sua_chave_aqui
```

---

## Sessão anterior — o que foi feito hoje (07/05/2026)

1. **Visualizador Flip** — novo componente `VisualizadorFlip.tsx` com animação 3D de virada de página. Acessado pelo botão "Finalizar livro" no Header.
2. **Capa e contracapa persistidas** — bug corrigido: saves eram feitos em uma chamada só; se `back_cover_url` não existia no Supabase, a chamada toda falhava silenciosamente. Agora cada campo é salvo separadamente.
3. **Migration `back_cover_url`** — coluna adicionada ao Supabase.
4. **`setActiveBook` merge** — ao carregar livro do Supabase, preserva `cover_url` e `back_cover_url` do localStorage se o Supabase não retornar esses campos.
5. **Abertura de capítulo persistida** — `IntercapaCapitulo.salvar` agora também chama `updateChapter` no Supabase. `setChapters` no store agora preserva todos os campos de abertura (opening_style, etc.) do localStorage quando o Supabase não os retorna.
6. **Logout** — botão de logout adicionado ao Header.
