import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Serviço de transcrição não configurado.' },
      { status: 503 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Erro ao ler o arquivo enviado.' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
  }

  const groqForm = new FormData()
  groqForm.append('file', file)
  groqForm.append('model', 'whisper-large-v3-turbo')
  groqForm.append('language', 'pt')
  groqForm.append('response_format', 'text')

  let res: Response
  try {
    res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    })
  } catch {
    return NextResponse.json({ error: 'Falha ao conectar com o serviço de transcrição.' }, { status: 502 })
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => 'Erro desconhecido')
    return NextResponse.json({ error: msg }, { status: res.status })
  }

  const text = await res.text()
  return NextResponse.json({ text: text.trim() })
}
