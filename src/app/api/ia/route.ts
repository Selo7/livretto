import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

interface MensagemHistorico {
  papel: 'usuario' | 'assistente'
  texto: string
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return new Response(
      'data: {"choices":[{"delta":{"content":"⚠️ Assistente IA não configurado."}}]}\n\ndata: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  const { mensagem, historico = [], contexto } = await req.json() as {
    mensagem: string
    historico: MensagemHistorico[]
    contexto?: { titulo?: string; capitulo?: string }
  }

  const sistema = [
    'Você é um assistente literário especializado em ajudar escritores brasileiros.',
    'Responda sempre em português do Brasil, de forma direta e criativa.',
    'Seja conciso — respostas curtas são preferíveis, exceto quando o escritor pedir algo extenso.',
    'Você conhece técnicas narrativas, estrutura de livros, estilos literários e formatação editorial.',
    contexto?.titulo   ? `O livro se chama "${contexto.titulo}".`     : '',
    contexto?.capitulo ? `O capítulo atual é "${contexto.capitulo}".` : '',
  ].filter(Boolean).join(' ')

  const messages = [
    { role: 'system', content: sistema },
    ...historico.map((m) => ({
      role: m.papel === 'usuario' ? 'user' : 'assistant',
      content: m.texto,
    })),
    { role: 'user', content: mensagem },
  ]

  let groqRes: Response
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        stream: true,
        max_tokens: 1024,
        messages,
      }),
    })
  } catch {
    return new Response(
      'data: {"choices":[{"delta":{"content":"Falha ao conectar com o assistente. Verifique sua conexão."}}]}\n\ndata: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  if (!groqRes.ok) {
    const err = await groqRes.text().catch(() => 'Erro desconhecido')
    return new Response(
      `data: {"choices":[{"delta":{"content":"Erro: ${err}"}}]}\n\ndata: [DONE]\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  // Groq usa o mesmo formato SSE do OpenAI — pipe direto sem adaptador
  return new Response(groqRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
