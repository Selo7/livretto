# Libretto — Documentação para Desenvolvimento com IA

**Nome:** Libretto · **Domínio alvo:** libretto.app · **Stack:** Next.js 15 + Supabase + Anthropic
Projeto construído por Bruno (brunobrm@gmail.com) com Claude como sócio de engenharia.
Plataforma SaaS para escritores brasileiros: editor profissional com preview ao vivo no formato final do livro.

---

## Visão do produto

**Problema:** escritores não conseguem ver como o livro ficará impresso enquanto escrevem.

**Solução:** editor + preview lado a lado com as dimensões reais do livro, IA integrada, e saída direta para publicação.

**Referências de UX:** Vellum (formatação visual) + Atticus (completude de features).

**Público:** escritores brasileiros — de amadores a profissionais — que querem autopublicar.

---

## Roadmap por versão

### v1 — MVP (em desenvolvimento)
- [x] Onboarding com seleção de formato
- [x] Editor TipTap com barra de formatação
- [x] Preview ao vivo com paginação dinâmica
- [x] Painel redimensionável (drag handle)
- [x] Múltiplos capítulos com barra lateral
- [x] Importação de .docx e .txt/.md
- [x] Intercapas de capítulos (5 estilos)
- [x] Configurações do livro (formato, título, autor)
- [x] Assistente IA com streaming (Claude Haiku)
- [x] Ditado por voz (Web Speech API)
- [x] Modo foco
- [x] Dark / light mode
- [x] Tela de finalização com classificação e sinopse
- [x] Landing page Libretto (identidade visual própria)
- [x] Schema Supabase completo (migrations/001_initial.sql)
- [x] Serviços backend (books.ts, chapters.ts, auth.ts)
- [x] Middleware Next.js para auth
- [x] Páginas de auth (login, callback) — tema Libretto
- [x] Exportação PDF final via Puppeteer (servidor) — download direto, sem diálogo de impressão
- [x] Exportação PDF de revisão (A4 fluente, marca d'água)
- [x] Exportação EPUB (apenas no wizard FinalizarLivro, após publicação)
- [x] Lock de edição ao publicar (banner âmbar + botão "Retomar edição")
- [x] Quota: plano gratuito = 1 livro publicado (brunobrm@gmail.com = ilimitado)
- [x] Formato KDP Amazon (5,5 × 8,5" / 13,97 × 21,59 cm)
- [ ] Integração store → Supabase (sync automático)
- [ ] Modo Mapa (React Flow — personagens)
- [ ] Modo Estrutura (drag de capítulos)
- [ ] Metas de escrita e streak diário

### v2 — Persistência real e polimento
- [ ] Sync Zustand → Supabase (debounced, ao salvar capítulo)
- [ ] Supabase Storage para imagens (capas, intercapas)
- [ ] Lista de livros do usuário (dashboard /books)
- [ ] Realtime (colaboração simultânea)
- [ ] LanguageTool para correção multilíngue
- [ ] Cover builder integrado

### v3 — API pública (ver seção abaixo)
- Endpoints REST para integrações externas
- Webhooks para eventos (livro publicado, capítulo salvo)
- API de exportação programática
- SDK para parceiros

### v4 — Marketplace + afiliados
- Loja integrada de livros
- Sistema de afiliados com comissão (modelo Hotmart)
- Marketplace de ilustradores para capas e intercapas
- Checkout Stripe integrado

---

## Stack técnica

| Camada | Tecnologia | Motivo |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR, Edge runtime, rotas de API |
| Editor | TipTap v3 (ProseMirror) | Extensível, suporta custom blocks |
| Estado | Zustand 5 + persist | Simples, sem boilerplate Redux |
| UI | shadcn/ui com Base UI | Componentes acessíveis sem Radix |
| Estilo | Tailwind CSS v4 | Utility-first, sem CSS separado |
| Banco | Supabase (PostgreSQL) | Auth + DB + Storage + Realtime |
| IA | Anthropic Claude API | claude-haiku-4-5 para chat, streaming SSE |
| Auth | Supabase Auth | Magic link + OAuth |
| Pagamentos | Stripe (v4) | Assinatura + marketplace |
| Exportação | Puppeteer PDF + epub-gen | Formatos editoriais profissionais |
| Mapa | React Flow (@xyflow/react) | Mapa mental de personagens |
| Import | Mammoth.js | Conversão .docx → HTML |
| Voz | Web Speech API | Ditado acessível, nativo do browser |

---

## Arquitetura de arquivos

```
supabase/
└── migrations/
    ├── 001_initial.sql             # Schema completo (books, chapters, profiles, sessions)
    └── 002_add_kdp_format.sql      # Adiciona 'kdp' ao CHECK constraint de format

src/
├── middleware.ts                   # Protege rotas /account, redireciona auth
├── app/
│   ├── page.tsx                    # Landing page Libretto (dark, Playfair Display)
│   ├── layout.tsx                  # Root layout — Geist + Playfair Display
│   ├── new/page.tsx                # Onboarding: formato + título (localStorage)
│   ├── books/page.tsx              # Dashboard: lista de livros do usuário
│   ├── auth/
│   │   ├── login/page.tsx          # Login / cadastro / magic link (tema Libretto)
│   │   └── callback/route.ts       # Handler OAuth e magic link
│   ├── editor/[bookId]/
│   │   └── page.tsx                # Editor principal
│   └── api/
│       ├── ia/route.ts             # Edge API: proxy streaming para Claude
│       ├── transcribe/route.ts     # Transcrição de áudio (voz)
│       └── export/pdf/route.ts     # Puppeteer: gera PDF e retorna como download
│
├── types/
│   └── book.ts                     # Book, Chapter, BookFormat, BookCategory, etc.
│
├── lib/
│   ├── store/
│   │   └── editorStore.ts          # Zustand (persiste localStorage, futura sync Supabase)
│   ├── exportBook.ts               # paginarParaExport, buildPrintHtml, buildReviewHtml, buildEpub, exportarPdfServidor
│   ├── supabase/
│   │   ├── client.ts               # Browser client (@supabase/ssr)
│   │   └── server.ts               # Server client (Server Components / API routes)
│   ├── services/
│   │   ├── auth.ts                 # signIn, signUp, signOut, Google, magic link
│   │   ├── books.ts                # CRUD livros no Supabase
│   │   └── chapters.ts             # CRUD capítulos no Supabase
│   └── utils.ts                    # cn() e utilitários
│
└── components/
    ├── layout/
    │   └── Header.tsx              # Modos, IA, foco, tema, "Finalizar livro"
    ├── editor/
    │   ├── BookEditor.tsx          # Orquestrador + lock de edição (publicado = somente leitura)
    │   ├── Toolbar.tsx             # Barra de formatação TipTap
    │   ├── ChapterSidebar.tsx      # Lista de capítulos + inline edit + intercapa
    │   ├── PagePreview.tsx         # Preview com paginação dinâmica
    │   ├── VisualizadorFlip.tsx    # Visualizador flip do livro completo
    │   ├── AssistenteIA.tsx        # Chat IA com streaming
    │   ├── ImportarArquivo.tsx     # Importação .docx / .txt / .md
    │   ├── ConfiguracaoLivro.tsx   # Modal: formato, título, autor, fonte
    │   ├── IntercapaCapitulo.tsx   # Modal: estilos de abertura do capítulo
    │   ├── ExportarLivro.tsx       # Dropdown no header: PDF final ou PDF revisão
    │   ├── CapaLivro.tsx           # Editor/upload de capa e contracapa
    │   └── FinalizarLivro.tsx      # Wizard 4 passos: classificação→sinopse→preço→publicar+exportar
    └── ui/
        ├── area-label.tsx          # Pill de identificação de áreas
        └── ...                     # shadcn/ui components
```

---

## Arquitetura de dados (Supabase)

```
auth.users ──┐
             ├── profiles (1:1) — plano, avatar
             ├── books (1:N)    — livros do usuário
             │   └── chapters (1:N) — capítulos com content JSONB + content_html
             └── writing_sessions (1:N) — streak e metas diárias
```

**Padrão de sync:** Zustand é o estado local (UI imediata). Quando logado, mudanças no livro/capítulo são sincronizadas para o Supabase de forma debounced (500ms para título, 2s para conteúdo). Offline funciona via localStorage.

**RLS:** Todas as tabelas têm Row Level Security — usuário só acessa seus próprios dados. Sem exceções.

---

## Auth flow

```
LP (/) → "Começar grátis" → /auth/login
  ├── Email + senha → Supabase signInWithPassword → /new
  ├── Google OAuth → /auth/callback → /new
  ├── Magic link → email → /auth/callback → /new
  └── "Continuar sem conta" → /new (localStorage mode)

/new → cria Book → se logado: Supabase + Zustand; se não: só Zustand
/editor/[id] → se logado: carrega do Supabase; se não: Zustand localStorage
```

---

## Padrões de código

### Zustand store
- Estado persiste em `localStorage` com chave `'book-projector-state'`
- `updateBook(patch)` faz partial patch em `activeBook`
- `updateChapterTitle` e `updateChapterOpening` atualizam `chapters[]` e `activeChapter` simultaneamente

### Componentes Base UI (shadcn)
```tsx
// shadcn usa @base-ui/react, NÃO Radix — padrão diferente:
// ERRADO: <TooltipTrigger asChild><Button /></TooltipTrigger>
// CERTO:
<TooltipTrigger render={<Button onClick={handler} />}>
  <IconeAqui />
</TooltipTrigger>
```

### Importações de imagem no editor
- Drag & drop mede largura natural da imagem
- Limita à largura da coluna: `Math.min(img.naturalWidth, larguraColuna)`

### Paginação dinâmica (PagePreview)
- `medidorRef`: div oculto off-screen mede altura de cada bloco HTML
- Distribui blocos em páginas respeitando `alturaUtil` (altura da área de texto)
- Scale dinâmico: `Math.min(0.85, (width * 0.88) / dims.width)`

### TipTap SSR
- Sempre usar `immediatelyRender: false` no `useEditor()` para evitar erro de hidratação

---

## Formatos de livro suportados

| ID | Nome | Dimensões reais | Width px | Height px |
|---|---|---|---|---|
| `14x21` | Livro | 14 × 21 cm | 530 | 794 |
| `15x23` | Livro Premium | 15 × 23 cm | 567 | 870 |
| `a5` | A5 | 14,8 × 21 cm | 559 | 794 |
| `pocket` | Bolso | 11 × 18 cm | 416 | 680 |
| `abnt` | ABNT | A4 com margens | 756 | 1071 |
| `kdp` | KDP Amazon | 5,5 × 8,5" (13,97 × 21,59 cm) | 528 | 816 |

---

## Intercapas de capítulos

Cada capítulo pode ter uma página de abertura (`opening_style`):

| Estilo | Descrição |
|---|---|
| `nenhum` | Sem intercapa (padrão) |
| `simples` | Número + título centralizados com linhas decorativas |
| `epigrafe` | Título + citação em bloco recuado |
| `ilustrado` | Imagem na metade superior, título embaixo |
| `pagina-inteira` | Imagem ou fundo escuro cobrindo a página inteira |

Campos do `Chapter` para intercapas: `opening_style`, `opening_image` (base64), `opening_epigraph`, `opening_epigraph_author`.

---

## Classificação de livros (FinalizarLivro)

| `BookCategory` | Subcategorias |
|---|---|
| `ficcao` | Romance, Thriller, Fantasia, Ficção científica, Conto, Horror, Mistério, Aventura |
| `nao-ficcao` | Auto-ajuda, Negócios, Economia, Biografia, História, Saúde, Espiritualidade, Política |
| `academico` | TCC, Dissertação, Tese, Ensaio, Artigo científico |
| `infantojuvenil` | Infantil, Juvenil, Paradidático, Fábula |
| `poesia` | Poesia, Crônica, Conto literário, Haiku |

`BookStatus`: `'escrevendo'` → `'revisao'` → `'publicado'`

---

## Plano de API pública (v3)

A API será REST + JSON, autenticada via API key de usuário.

### Endpoints previstos

```
# Livros
GET    /api/v1/books
POST   /api/v1/books
GET    /api/v1/books/:id
PATCH  /api/v1/books/:id
DELETE /api/v1/books/:id

# Capítulos
GET    /api/v1/books/:id/chapters
POST   /api/v1/books/:id/chapters
PATCH  /api/v1/books/:id/chapters/:chapterId

# Exportação programática
POST   /api/v1/books/:id/export/pdf
POST   /api/v1/books/:id/export/epub

# IA (rate-limited por plano)
POST   /api/v1/ai/suggest          # Sugestão de continuação
POST   /api/v1/ai/review           # Revisão de trecho
POST   /api/v1/ai/bibliography     # Busca de referências

# Webhooks
POST   /api/v1/webhooks            # Registrar endpoint
# Eventos: book.published, chapter.saved, export.ready
```

### Features exclusivas da API (v3)
- Importação em lote de manuscritos
- Exportação programática (PDF/EPUB via webhook)
- Integração com ferramentas de escrita externas (Obsidian, Notion, etc.)
- Acesso à IA para pipelines editoriais automatizados

### Rate limits por plano
| Plano | Chamadas/mês | IA tokens/mês |
|---|---|---|
| Gratuito | 100 | 10.000 |
| Pro | 10.000 | 500.000 |
| Publisher | Ilimitado | Ilimitado |

---

## Variáveis de ambiente

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...

# Supabase (v2)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (v4)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Exportação PDF (dev local apenas — em produção usa @sparticuz/chromium)
CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

---

## Comandos

```bash
npm run dev      # Servidor de desenvolvimento (http://localhost:3000)
npm run build    # Build de produção
npm run start    # Servidor de produção
npx tsc --noEmit # Checar TypeScript sem compilar
```

---

## Decisões importantes

- **Google Drive EBADF**: npm não consegue escrever em pasta sincronizada. Projeto em `C:\Users\quali\Projects\book-projector`.
- **Base UI vs Radix**: shadcn 4.x usa `@base-ui/react`. `asChild` não existe; usar `render={<Component />}`.
- **Persist no localStorage**: state do editor persiste entre reloads. Chave: `'book-projector-state'`.
- **Imagens em base64**: por enquanto armazenadas no estado local. Na v2, subir para Supabase Storage.
- **Modelo IA**: `claude-haiku-4-5-20251001` para chat (velocidade + custo). Considerar Sonnet para revisão profunda na v3.
- **PDF via Puppeteer**: `POST /api/export/pdf` recebe HTML completo, renderiza com `puppeteer-core` + `@sparticuz/chromium` (produção) ou `CHROME_EXECUTABLE_PATH` (dev local). Requer Vercel Pro para timeout >10s. `vercel.json` configura 1024MB e 60s.
- **Paginador vs render**: `paginarParaExport` mede blocos no DOM do browser a `11px` com `SAFETY=100px`. O `buildPrintHtml` replica o CSS exato do `globals.css .book-page-content` para que a medição e o render sejam idênticos.
- **EPUB só após publicação**: exportar EPUB antes de publicar permitiria burlar o limite de livros do plano gratuito. EPUB só aparece no wizard `FinalizarLivro` após marcar como publicado.
- **Quota plano gratuito**: 1 livro publicado por conta. Verificação via Supabase count antes de `salvarEPublicar`. `brunobrm@gmail.com` é ilimitado (hardcoded como owner).
- **KDP API**: Amazon KDP não tem API pública. O fluxo é exportar PDF/EPUB nas dimensões corretas e o usuário faz upload manualmente em kdp.amazon.com. Para automação futura: parceria com agregador (Draft2Digital, IngramSpark).
