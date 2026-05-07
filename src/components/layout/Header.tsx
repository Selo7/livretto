'use client'

import { BookOpen, Map, LayoutGrid, Moon, Sun, Maximize2, Sparkles, Save, Rocket, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { AreaLabel } from '@/components/ui/area-label'
import { useEditorStore } from '@/lib/store/editorStore'
import { FinalizarLivro } from '@/components/editor/FinalizarLivro'
import { VisualizadorFlip } from '@/components/editor/VisualizadorFlip'
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
      <div className="flex items-center gap-2 min-w-40">
        <BookOpen size={18} className="text-primary" />
        <span className="font-semibold text-sm truncate max-w-36">
          {activeBook?.title ?? 'Book Projector'}
        </span>
        <AreaLabel>Menu Superior</AreaLabel>
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
