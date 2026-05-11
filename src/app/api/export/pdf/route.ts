import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { html, filename } = await req.json()
  if (!html || typeof html !== 'string') {
    return NextResponse.json({ error: 'HTML inválido' }, { status: 400 })
  }

  let browser: import('puppeteer-core').Browser | null = null
  try {
    let executablePath: string
    let args: string[]

    if (process.env.CHROME_EXECUTABLE_PATH) {
      executablePath = process.env.CHROME_EXECUTABLE_PATH
      args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    } else {
      const chromium = (await import('@sparticuz/chromium')).default
      executablePath = await chromium.executablePath()
      args = [...chromium.args, '--disable-dev-shm-usage']
    }

    const puppeteer = (await import('puppeteer-core')).default
    browser = await puppeteer.launch({ args, executablePath, headless: true })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 45000 })
    await page.evaluateHandle('document.fonts.ready')

    const pdf = await page.pdf({
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    const safe = (filename || 'livro').replace(/[^\w\sçãõáéíóúâêîôûàü-]/gi, '').trim() || 'livro'
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safe)}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[pdf-export]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar PDF' },
      { status: 500 },
    )
  } finally {
    if (browser) await browser.close()
  }
}
