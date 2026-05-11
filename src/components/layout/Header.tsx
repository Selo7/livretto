'use client'

import { BookOpen, Map, LayoutGrid, Moon, Sun, Maximize2, Sparkles, Save, Rocket, LogOut, ChevronDown, Library, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { AreaLabel } from '@/components/ui/area-label'
import { useEditorStore } from '@/lib/store/editorStore'
import { FinalizarLivro } from '@/components/editor/FinalizarLivro'
import { VisualizadorFlip } from '@/components/editor/VisualizadorFlip'
import { ExportarLivro } from '@/components/editor/ExportarLivro'
import { AppMode } from '@/types/book'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const modes: { id: AppMode; label: string; icon: React.ReactNode }[] = [
  { id: 'write', label: 'Escrever', icon: <BookOpen size={16} /> },
  { id: 'map', label: 'Mapa', icon: <Map size={16} /> },
  { id: 'structure', label: 'Estrutura', icon: <LayoutGrid size={16} /> },
]

export function Header() {
  const { mode, setMode, activeBook, isFocusMode, toggleFocusMode, isAIPanelOpen, toggleAIPanel, wordCount, sessionWords } = useEditorStore()
  const [isDark, setIsDark] = useState(false)
  const [finalizarAberto, setFinalizarAberto] = useState(false)
  const [showFlip, setShowFlip] = useState(false)
  const [bookMenuOpen, setBookMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  function toggleTheme() {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  if (isFocusMode) return null

  return (
    <header className="h-12 border-b border-border bg-background flex items-center px-4 gap-4 shrink-0 z-50">
      {/* Book switcher */}
      <div className="relative flex items-center min-w-40">
        <button
          onClick={() => setBookMenuOpen(v => !v)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent transition-colors"
        >
          <BookOpen size={16} className="text-primary shrink-0" />
          <span className="font-semibold text-sm truncate max-w-32">
            {activeBook?.title ?? 'Livretto'}
          </span>
          <ChevronDown size={12} className={cn('text-muted-foreground shrink-0 transition-transform', bookMenuOpen && 'rotate-180')} />
        </button>
        <AreaLabel>Menu Superior</AreaLabel>

        {bookMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setBookMenuOpen(false)} />
            <div className="absolute top-full left-0 mt-1.5 z-50 bg-background border border-border rounded-xl shadow-xl py-1 w-56 overflow-hidden">
              {activeBook && (
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-xs font-semibold text-foreground truncate">{activeBook.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Livro atual</p>
                </div>
              )}
              <Link
                href="/books"
                onClick={() => setBookMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Library size={14} className="text-muted-foreground" />
                Meus livros
              </Link>
              <Link
                href="/new"
                onClick={() => setBookMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Plus size={14} className="text-muted-foreground" />
                Novo livro
              </Link>
            </div>
          </>
        )}
      </div>

      <Separator orientation="vertical" className="h-5" />

      <nav className="flex items-center gap-1">
        {modes.map((m) => (
          <Button
            key={m.id}
            variant={mode === m.id ? 'secondary' : 'ghost'}
            size="sm"
            className={cn('gap-1.5 h-8 text-xs', mode === m.id && 'font-medium')}
            onClick={() => setMode(m.id)}
          >
            {m.icon}
            {m.label}
          </Button>
        ))}
      </nav>

      <div className="flex-1" />

      {mode === 'write' && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{wordCount.toLocaleString()} palavras</span>
          {sessionWords > 0 && (
            <span className="text-green-600 dark:text-green-400">+{sessionWords} hoje</span>
          )}
        </div>
      )}

      <Separator orientation="vertical" className="h-5" />

      <div className="flex items-center gap-2">
        <Button
          variant={isAIPanelOpen ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs font-medium',
            !isAIPanelOpen && 'border-primary/40 text-primary hover:bg-primary/10'
          )}
          onClick={toggleAIPanel}
        >
          <Sparkles size={13} />
          Assistente IA
        </Button>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFocusMode} />
            }
          >
            <Maximize2 size={15} />
          </TooltipTrigger>
          <TooltipContent>Modo foco (F)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme} />
            }
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </TooltipTrigger>
          <TooltipContent>{isDark ? 'Modo claro' : 'Modo escuro'}</TooltipContent>
        </Tooltip>

        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <Save size={13} />
          Salvo
        </Button>

        <Separator orientation="vertical" className="h-5" />

        <ExportarLivro />

        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setShowFlip(true)}
        >
          <Rocket size={13} />
          Finalizar livro
        </Button>

        <Separator orientation="vertical" className="h-5" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleLogout} />
            }
          >
            <LogOut size={15} />
          </TooltipTrigger>
          <TooltipContent>Sair</TooltipContent>
        </Tooltip>
      </div>

      {finalizarAberto && <FinalizarLivro onClose={() => setFinalizarAberto(false)} />}
      {showFlip && (
        <VisualizadorFlip
          onClose={() => setShowFlip(false)}
          onContinuar={() => { setShowFlip(false); setFinalizarAberto(true) }}
        />
      )}
    </header>
  )
}
