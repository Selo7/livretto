'use client'

import { useRef, useState } from 'react'
import { type Editor } from '@tiptap/react'
import { FileAudio, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TAMANHO_MAX_MB = 25
const TIPOS_ACEITOS = '.mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,.ogg,.flac'

interface ImportarAudioProps {
  editor: Editor | null
}

export function ImportarAudio({ editor }: ImportarAudioProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [transcrevendo, setTranscrevendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editor) return

    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setErro(`Arquivo muito grande. Limite: ${TAMANHO_MAX_MB} MB.`)
      return
    }

    setErro(null)
    setTranscrevendo(true)

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Erro na transcrição.')

      const { text } = data as { text: string }
      if (!text) throw new Error('A transcrição retornou vazia.')

      // Cada linha vira um parágrafo; linhas em branco viram parágrafo vazio
      const paragrafos = text
        .split('\n')
        .map((linha) => `<p>${linha.trim() || '<br/>'}</p>`)
        .join('')

      editor.chain().focus().insertContent(paragrafos).run()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao transcrever o áudio.')
    } finally {
      setTranscrevendo(false)
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ACEITOS}
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        title={`Importar áudio e transcrever (máx. ${TAMANHO_MAX_MB} MB)`}
        disabled={transcrevendo}
        onMouseDown={(e) => {
          e.preventDefault()
          setErro(null)
          inputRef.current?.click()
        }}
        className={cn(
          'inline-flex items-center gap-1.5 h-7 px-2 rounded-md transition-colors text-xs font-medium whitespace-nowrap',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        {transcrevendo
          ? <Loader2 size={13} className="animate-spin" />
          : <FileAudio size={13} />}
        {transcrevendo ? 'Transcrevendo…' : '♪ Áudio'}
      </button>

      {erro && (
        <div className="absolute top-full left-0 mt-1 z-50 max-w-xs rounded-md border border-destructive/40 bg-background px-3 py-2 text-xs text-destructive shadow-md whitespace-normal">
          {erro}
          <button
            className="ml-2 underline opacity-70 hover:opacity-100"
            onMouseDown={(e) => { e.preventDefault(); setErro(null) }}
          >
            fechar
          </button>
        </div>
      )}
    </div>
  )
}
