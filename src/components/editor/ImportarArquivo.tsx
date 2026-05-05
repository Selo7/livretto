'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ImportarArquivoProps {
  onImportar: (html: string, nomeArquivo: string) => void
}

type Estado = 'idle' | 'arrastando' | 'processando' | 'sucesso' | 'erro'

const EXTENSOES_ACEITAS = '.docx,.doc,.txt,.odt,.md'
const TIPOS_ACEITOS = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/vnd.oasis.opendocument.text',
  'text/markdown',
]

export function ImportarArquivo({ onImportar }: ImportarArquivoProps) {
  const [aberto, setAberto] = useState(false)
  const [estado, setEstado] = useState<Estado>('idle')
  const [mensagem, setMensagem] = useState('')
  const [nomeArquivo, setNomeArquivo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function processarArquivo(arquivo: File) {
    setEstado('processando')
    setNomeArquivo(arquivo.name)

    try {
      let html = ''

      if (arquivo.name.endsWith('.docx') || arquivo.name.endsWith('.doc')) {
        const mammoth = await import('mammoth')
        const buffer = await arquivo.arrayBuffer()
        const resultado = await mammoth.convertToHtml({ arrayBuffer: buffer })
        html = resultado.value

        if (resultado.messages.length > 0) {
          console.warn('Avisos na importação:', resultado.messages)
        }
      } else if (arquivo.name.endsWith('.txt') || arquivo.name.endsWith('.md')) {
        const texto = await arquivo.text()
        html = texto
          .split('\n\n')
          .filter(Boolean)
          .map((p) => {
            if (p.startsWith('# ')) return `<h1>${p.slice(2)}</h1>`
            if (p.startsWith('## ')) return `<h2>${p.slice(3)}</h2>`
            if (p.startsWith('### ')) return `<h3>${p.slice(4)}</h3>`
            return `<p>${p.replace(/\n/g, '<br/>')}</p>`
          })
          .join('')
      } else {
        throw new Error('Formato não suportado. Use .docx, .txt ou .md')
      }

      if (!html.trim()) throw new Error('O arquivo parece estar vazio.')

      setEstado('sucesso')
      setMensagem(`${arquivo.name} importado com sucesso!`)
      setTimeout(() => {
        onImportar(html, arquivo.name.replace(/\.[^/.]+$/, ''))
        setAberto(false)
        setEstado('idle')
        setMensagem('')
      }, 1200)
    } catch (err) {
      setEstado('erro')
      setMensagem(err instanceof Error ? err.message : 'Erro ao importar o arquivo.')
    }
  }

  function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (arquivo) processarArquivo(arquivo)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setEstado('idle')
    const arquivo = e.dataTransfer.files[0]
    if (arquivo) {
      if (!TIPOS_ACEITOS.includes(arquivo.type) && !arquivo.name.match(/\.(docx?|txt|odt|md)$/i)) {
        setEstado('erro')
        setMensagem('Formato não suportado. Use .docx, .txt ou .md')
        return
      }
      processarArquivo(arquivo)
    }
  }

  function resetar() {
    setEstado('idle')
    setMensagem('')
    setNomeArquivo('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setAberto(true)}>
        <Upload size={13} />
        Importar arquivo
      </Button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-sm">Importar rascunho</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Word (.docx), Texto (.txt) ou Markdown (.md)</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAberto(false); resetar() }}>
                <X size={14} />
              </Button>
            </div>

            <div className="p-5">
              {estado === 'idle' || estado === 'arrastando' ? (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    estado === 'arrastando'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  )}
                  onDragOver={(e) => { e.preventDefault(); setEstado('arrastando') }}
                  onDragLeave={() => setEstado('idle')}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                >
                  <FileText size={36} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">Arraste o arquivo aqui</p>
                  <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-3 opacity-60">.docx · .txt · .md</p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={EXTENSOES_ACEITAS}
                    className="hidden"
                    onChange={onArquivoSelecionado}
                  />
                </div>
              ) : estado === 'processando' ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Processando {nomeArquivo}...</p>
                  <p className="text-xs text-muted-foreground opacity-60">A IA está interpretando a estrutura do texto</p>
                </div>
              ) : estado === 'sucesso' ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <CheckCircle size={32} className="text-green-500" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">{mensagem}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6">
                  <AlertCircle size={32} className="text-destructive" />
                  <p className="text-sm text-destructive text-center">{mensagem}</p>
                  <Button variant="outline" size="sm" onClick={resetar}>Tentar novamente</Button>
                </div>
              )}
            </div>

            {(estado === 'idle' || estado === 'arrastando') && (
              <div className="px-5 pb-4">
                <p className="text-xs text-muted-foreground text-center">
                  O arquivo será interpretado e a estrutura de capítulos será detectada automaticamente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
