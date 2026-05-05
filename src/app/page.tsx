'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'

// ── Tokens ────────────────────────────────────────────────
const C = {
  bg:          '#0a0907',
  surface:     '#111009',
  card:        '#1a1610',
  cardHover:   '#201d13',
  border:      '#2a2218',
  borderLight: '#3a3228',
  text:        '#f0e8d6',
  muted:       '#9a8870',
  faint:       '#4a3c2e',
  accent:      '#c8720a',
  accentLight: '#e08c2a',
}

// ── Typewriter mark SVG ───────────────────────────────────
function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.9)} viewBox="0 0 40 36" fill="none" aria-hidden>
      <rect x="12" y="0" width="16" height="11" rx="1.5" stroke={C.accent} strokeWidth="1.5"/>
      <line x1="15" y1="3.5" x2="25" y2="3.5" stroke={C.accent} strokeWidth="1" opacity="0.55"/>
      <line x1="15" y1="7" x2="22" y2="7" stroke={C.accent} strokeWidth="1" opacity="0.3"/>
      <rect x="3" y="9.5" width="34" height="5.5" rx="2.75" stroke={C.accent} strokeWidth="1.5" fill={C.card}/>
      <rect x="1" y="14.5" width="38" height="21" rx="3" stroke={C.accent} strokeWidth="1.5" fill={C.card}/>
      {[6,12.5,19,25.5,32].map((x) => (
        <rect key={x} x={x} y="19" width="5" height="3.5" rx="1" fill={C.accent} opacity="0.8"/>
      ))}
      {[6,12.5,19,25.5,32].map((x) => (
        <rect key={x+'b'} x={x} y="25.5" width="5" height="3.5" rx="1" fill={C.accent} opacity="0.45"/>
      ))}
    </svg>
  )
}

// ── Fade-in on scroll hook ────────────────────────────────
function useFadeIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(28px)'
    el.style.transition = `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
        obs.disconnect()
      }
    }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])
  return ref
}

// ── Product mockup ────────────────────────────────────────
function EditorMockup() {
  const [cursor, setCursor] = useState(true)
  useEffect(() => {
    const t = setInterval(() => setCursor((v) => !v), 530)
    return () => clearInterval(t)
  }, [])

  const textLines = [
    'Era uma tarde de novembro quando Maria',
    'encontrou a carta debaixo da porta. A letra',
    'estava borrada pela chuva, mas o nome no',
    'envelope era inconfundível — o dela.',
    '',
    'Ela ficou parada no corredor por longos',
    'minutos, com o envelope fechado na mão.',
  ]

  const pageLines = [
    'Era uma tarde de novembro',
    'quando Maria encontrou a carta',
    'debaixo da porta. A letra estava',
    'borrada pela chuva, mas o nome',
    'no envelope era inconfundível',
    '— o dela.',
    '',
    'Ela ficou parada no corredor',
    'por longos minutos, com o',
    'envelope fechado na mão.',
  ]

  return (
    <div style={{
      border: `1px solid ${C.borderLight}`,
      borderRadius: 12,
      overflow: 'hidden',
      background: C.surface,
      boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,114,10,0.08)',
      maxWidth: 780,
      width: '100%',
    }}>
      {/* Window chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
        {['#ff5f57','#ffbd2e','#28c840'].map((c) => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }}/>
        ))}
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: C.muted, fontFamily: 'var(--font-geist-sans)' }}>
          Libretto — O Chamado
        </div>
      </div>

      <div style={{ display: 'flex', height: 320 }}>
        {/* Chapter sidebar */}
        <div style={{ width: 140, borderRight: `1px solid ${C.border}`, background: C.card, padding: '12px 0', flexShrink: 0 }}>
          <div style={{ padding: '0 12px', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Capítulos</span>
          </div>
          {['Prólogo', 'O Chamado', 'A Travessia', 'O Retorno'].map((ch, i) => (
            <div key={ch} style={{
              padding: '6px 12px',
              fontSize: 11,
              color: i === 1 ? C.text : C.muted,
              background: i === 1 ? C.border : 'transparent',
              borderLeft: i === 1 ? `2px solid ${C.accent}` : '2px solid transparent',
              cursor: 'default',
            }}>
              {ch}
            </div>
          ))}
        </div>

        {/* Editor */}
        <div style={{ flex: 1, padding: '20px 24px', overflow: 'hidden', fontFamily: 'Georgia, serif' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 16 }}>O Chamado</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.85 }}>
            {textLines.map((line, i) => (
              <div key={i}>
                {line}
                {i === textLines.length - 1 && (
                  <span style={{
                    display: 'inline-block',
                    width: 1.5,
                    height: 13,
                    background: C.accent,
                    marginLeft: 1,
                    verticalAlign: 'middle',
                    opacity: cursor ? 1 : 0,
                    transition: 'opacity 0.1s',
                  }}/>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preview panel */}
        <div style={{
          width: 200,
          borderLeft: `1px solid ${C.border}`,
          background: '#0e0c09',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          flexShrink: 0,
        }}>
          {/* Page */}
          <div style={{
            width: 142,
            height: 213,
            background: '#faf8f0',
            borderRadius: 2,
            boxShadow: '4px 4px 16px rgba(0,0,0,0.5)',
            position: 'relative',
            padding: '18px 14px 18px 16px',
          }}>
            <div style={{ fontSize: 6.5, fontFamily: 'Georgia, serif', color: '#1a1a1a', lineHeight: 1.75 }}>
              {pageLines.map((line, i) => (
                <div key={i} style={{ minHeight: '1em' }}>{line}</div>
              ))}
            </div>
            <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 6, color: '#bbb' }}>1</div>
          </div>
          <div style={{ marginTop: 8, fontSize: 9, color: C.faint }}>14 × 21 cm</div>
        </div>
      </div>
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px', height: 60,
      background: scrolled ? 'rgba(10,9,7,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Mark size={26}/>
        <span style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontSize: 20, color: C.text, letterSpacing: '-0.02em' }}>
          Libretto
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 13, color: C.muted }}>
        <a href="#recursos" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>Recursos</a>
        <a href="#precos" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>Preços</a>
        <Link href="/auth/login" style={{ color: C.muted, textDecoration: 'none', fontSize: 13 }}
          onMouseEnter={e => (e.currentTarget.style.color = C.text)}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
        >
          Entrar
        </Link>
        <Link href="/auth/login" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: C.accent, color: '#fff',
          padding: '7px 16px', borderRadius: 7,
          fontSize: 13, fontWeight: 500, textDecoration: 'none',
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = C.accentLight)}
          onMouseLeave={e => (e.currentTarget.style.background = C.accent)}
        >
          Começar grátis
          <ArrowRight size={13}/>
        </Link>
      </div>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ paddingTop: 140, paddingBottom: 100, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        border: `1px solid ${C.borderLight}`,
        borderRadius: 20, padding: '4px 12px',
        fontSize: 11, color: C.accent, marginBottom: 36,
        letterSpacing: '0.05em',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, display: 'inline-block' }}/>
        Editor de livros com preview ao vivo
      </div>

      <h1 style={{
        fontFamily: 'var(--font-playfair)',
        fontSize: 'clamp(48px, 7vw, 88px)',
        fontWeight: 700,
        lineHeight: 1.08,
        color: C.text,
        letterSpacing: '-0.03em',
        marginBottom: 28,
        maxWidth: 700,
      }}>
        Onde as palavras<br/>
        <span style={{ fontStyle: 'italic', color: C.accent }}>viram páginas.</span>
      </h1>

      <p style={{ fontSize: 17, color: C.muted, maxWidth: 500, lineHeight: 1.7, marginBottom: 44 }}>
        Escreva e veja seu livro no tamanho real da impressão.
        Preview ao vivo, intercapas elegantes, IA contextual.
        Do rascunho à publicação.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 72 }}>
        <Link href="/auth/login" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.accent, color: '#fff',
          padding: '13px 28px', borderRadius: 9,
          fontSize: 15, fontWeight: 600, textDecoration: 'none',
          boxShadow: `0 0 40px ${C.accent}40`,
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = C.accentLight; e.currentTarget.style.boxShadow = `0 0 60px ${C.accentLight}50` }}
          onMouseLeave={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.boxShadow = `0 0 40px ${C.accent}40` }}
        >
          Começar agora — é grátis
          <ArrowRight size={15}/>
        </Link>
        <a href="#recursos" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${C.border}`, color: C.muted,
          padding: '13px 24px', borderRadius: 9,
          fontSize: 15, textDecoration: 'none',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.color = C.text }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
        >
          Ver como funciona
        </a>
      </div>

      <EditorMockup/>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────
const FEATURES = [
  {
    tag: 'Preview ao vivo',
    title: 'O leitor já lê enquanto você escreve.',
    body: 'Veja cada página nas dimensões reais de impressão — margens exatas, tipografia, paginação. Nada de surpresa na gráfica. O que você vê é o que o leitor vai segurar nas mãos.',
    visual: <PreviewVisual/>,
  },
  {
    tag: 'Intercapas',
    title: 'A abertura que diz: isso é sério.',
    body: 'Cinco estilos de intercapa por capítulo — simples, com epígrafe, ilustrado, página inteira com imagem. O primeiro impacto antes da primeira palavra do capítulo.',
    visual: <IntercapaVisual/>,
  },
  {
    tag: 'Assistente IA',
    title: 'Um assistente que leu o que você escreveu.',
    body: 'Contexto completo do capítulo. Sugestão de continuação, revisão de trecho, busca de referências bibliográficas. Powered by Claude — tudo sem sair da tela.',
    visual: <IAVisual/>,
  },
]

function PreviewVisual() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 24 }}>
      <div style={{ flex: 1, fontSize: 11, fontFamily: 'Georgia, serif', color: C.muted, lineHeight: 1.8 }}>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 12 }}>Capítulo 2</div>
        {'A manhã chegou com neblina fina cobrindo os campos. João acordou antes do sol, como sempre fez desde os doze anos.'.split(' ').reduce((acc, word, i) => acc + (i === 0 ? '' : ' ') + word, '')}
        <span style={{ display: 'inline-block', width: 1.5, height: 11, background: C.accent, marginLeft: 2, verticalAlign: 'middle', animation: 'blink 1.1s step-end infinite' }}/>
      </div>
      <div style={{ width: 90, height: 128, background: '#faf8f0', borderRadius: 2, boxShadow: '3px 3px 12px rgba(0,0,0,0.5)', padding: '10px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 5, fontFamily: 'Georgia, serif', color: '#1a1a1a', lineHeight: 1.8 }}>
          {'A manhã chegou com neblina fina cobrindo os campos. João acordou antes do sol, como sempre fez desde os doze anos.'.split(' ').map((w, i) => <span key={i}>{w} </span>)}
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontSize: 5, color: '#bbb' }}>2</div>
      </div>
    </div>
  )
}

function IntercapaVisual() {
  const estilos = [
    { label: 'Simples', bg: '#faf8f0', content: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 }}>
        <div style={{ width: 24, height: 1, background: '#c8b89a' }}/>
        <div style={{ width: 36, height: 2.5, background: '#333', borderRadius: 1 }}/>
        <div style={{ width: 28, height: 1.5, background: '#888', borderRadius: 1 }}/>
        <div style={{ width: 24, height: 1, background: '#c8b89a' }}/>
      </div>
    )},
    { label: 'Ilustrado', bg: '#faf8f0', content: (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '55%', background: 'linear-gradient(135deg, #e0d8c8, #c8baa0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 16, height: 12, background: '#b0a080', borderRadius: 1, opacity: 0.6 }}/>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <div style={{ width: 32, height: 2, background: '#444', borderRadius: 1 }}/>
          <div style={{ width: 22, height: 1.5, background: '#888', borderRadius: 1 }}/>
        </div>
      </div>
    )},
    { label: 'Página inteira', bg: '#1a1510', content: (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(160deg, #3a3530, #1a1510)', padding: '8px 6px' }}>
        <div style={{ width: 32, height: 2, background: 'rgba(255,255,255,0.85)', borderRadius: 1, marginBottom: 3 }}/>
        <div style={{ width: 22, height: 1.5, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }}/>
      </div>
    )},
  ]
  return (
    <div style={{ display: 'flex', gap: 12, padding: 24, alignItems: 'flex-end' }}>
      {estilos.map(({ label, bg, content }) => (
        <div key={label} style={{ flex: 1 }}>
          <div style={{ height: 90, background: bg, borderRadius: 3, border: `1px solid ${C.border}`, overflow: 'hidden', position: 'relative' }}>
            {content}
          </div>
          <div style={{ textAlign: 'center', fontSize: 9, color: C.muted, marginTop: 5 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

function IAVisual() {
  const msgs = [
    { role: 'user', text: 'Sugira uma continuação para o parágrafo sobre Maria e a carta.' },
    { role: 'ai', text: 'Maria rompeu o envelope com cuidado excessivo, como se a precipitação pudesse desfazer o que havia dentro. O papel estava úmido nas bordas...' },
  ]
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {msgs.map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
          <div style={{
            maxWidth: '80%', padding: '8px 12px', borderRadius: 10,
            fontSize: 11, lineHeight: 1.6,
            background: m.role === 'user' ? C.accent : C.card,
            color: m.role === 'user' ? '#fff' : C.muted,
            border: m.role === 'ai' ? `1px solid ${C.border}` : 'none',
          }}>
            {m.text}
          </div>
        </div>
      ))}
    </div>
  )
}

function Features() {
  return (
    <section id="recursos" style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 40, color: C.text, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
          Cada detalhe importa.
        </h2>
        <p style={{ color: C.muted, fontSize: 16 }}>Construído para escritores que levam a obra a sério.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {FEATURES.map(({ tag, title, body, visual }, i) => {
          const ref = useFadeIn(i * 80)
          return (
            <div
              key={tag}
              ref={ref}
              style={{
                display: 'grid',
                gridTemplateColumns: i % 2 === 0 ? '1fr 1.2fr' : '1.2fr 1fr',
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                overflow: 'hidden',
                background: C.card,
              }}
            >
              <div style={{ order: i % 2 === 0 ? 1 : 2, padding: '48px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: C.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>{tag}</span>
                <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, color: C.text, fontWeight: 700, lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.015em' }}>{title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75 }}>{body}</p>
              </div>
              <div style={{
                order: i % 2 === 0 ? 2 : 1,
                background: C.surface,
                borderLeft: i % 2 === 0 ? `1px solid ${C.border}` : 'none',
                borderRight: i % 2 === 1 ? `1px solid ${C.border}` : 'none',
                minHeight: 220,
              }}>
                {visual}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────
const PLANOS = [
  {
    nome: 'Rascunho',
    preco: 'Grátis',
    desc: 'Para começar. Sem cartão.',
    features: ['1 livro', '5 capítulos', 'Preview ao vivo', 'Todos os formatos'],
    cta: 'Começar grátis',
    destaque: false,
  },
  {
    nome: 'Escritor',
    preco: 'R$ 29',
    period: '/mês',
    desc: 'Para quem leva a obra a sério.',
    features: ['Livros ilimitados', 'Capítulos ilimitados', 'Assistente IA', 'Exportação PDF + EPUB', 'Intercapas com imagem', 'Ditado por voz'],
    cta: 'Começar agora',
    destaque: true,
  },
  {
    nome: 'Publisher',
    preco: 'R$ 79',
    period: '/mês',
    desc: 'Para publicar e vender.',
    features: ['Tudo do Escritor', 'API pública', 'Afiliados e marketplace', 'Suporte prioritário', 'Exportação em lote'],
    cta: 'Falar com a equipe',
    destaque: false,
  },
]

function Pricing() {
  const ref = useFadeIn(0)
  return (
    <section id="precos" style={{ maxWidth: 960, margin: '0 auto', padding: '80px 40px' }}>
      <div ref={ref} style={{ textAlign: 'center', marginBottom: 56 }}>
        <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 40, color: C.text, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
          Simples. Transparente.
        </h2>
        <p style={{ color: C.muted, fontSize: 16 }}>Comece grátis. Cresça quando precisar.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {PLANOS.map(({ nome, preco, period, desc, features, cta, destaque }) => (
          <div
            key={nome}
            style={{
              border: `1px solid ${destaque ? C.accent : C.border}`,
              borderRadius: 14,
              padding: '32px 28px',
              background: destaque ? `${C.accent}12` : C.card,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxShadow: destaque ? `0 0 40px ${C.accent}20` : 'none',
            }}
          >
            {destaque && (
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: C.accent, color: '#fff',
                fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                padding: '3px 12px', borderRadius: 20,
              }}>
                MAIS POPULAR
              </div>
            )}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>{nome}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 36, fontWeight: 700, color: C.text }}>{preco}</span>
                {period && <span style={{ fontSize: 13, color: C.muted }}>{period}</span>}
              </div>
              <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>{desc}</div>
            </div>

            <div style={{ flex: 1, marginBottom: 24 }}>
              {features.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, color: C.muted }}>
                  <Check size={12} style={{ color: C.accent, flexShrink: 0 }}/>
                  {f}
                </div>
              ))}
            </div>

            <Link
              href="/auth/login"
              style={{
                display: 'block', textAlign: 'center',
                padding: '11px 0', borderRadius: 8,
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                background: destaque ? C.accent : 'transparent',
                color: destaque ? '#fff' : C.muted,
                border: destaque ? 'none' : `1px solid ${C.border}`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = destaque ? C.accentLight : C.card
                e.currentTarget.style.color = destaque ? '#fff' : C.text
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = destaque ? C.accent : 'transparent'
                e.currentTarget.style.color = destaque ? '#fff' : C.muted
              }}
            >
              {cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Final CTA ─────────────────────────────────────────────
function FinalCTA() {
  const ref = useFadeIn(0)
  return (
    <section style={{ padding: '80px 40px 120px', textAlign: 'center' }}>
      <div ref={ref} style={{
        maxWidth: 600, margin: '0 auto',
        border: `1px solid ${C.borderLight}`,
        borderRadius: 20, padding: '64px 48px',
        background: C.card,
        boxShadow: `0 0 80px ${C.accent}10`,
      }}>
        <Mark size={40}/>
        <h2 style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: 38, fontWeight: 700,
          color: C.text, letterSpacing: '-0.02em',
          marginTop: 20, marginBottom: 16, lineHeight: 1.2,
        }}>
          Sua história merece<br/>
          <span style={{ fontStyle: 'italic', color: C.accent }}>a forma certa.</span>
        </h2>
        <p style={{ color: C.muted, fontSize: 15, marginBottom: 36, lineHeight: 1.7 }}>
          Comece hoje. O primeiro livro é gratuito,<br/>sem cartão de crédito.
        </p>
        <Link href="/auth/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: C.accent, color: '#fff',
          padding: '14px 32px', borderRadius: 10,
          fontSize: 15, fontWeight: 600, textDecoration: 'none',
          boxShadow: `0 0 40px ${C.accent}50`,
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = C.accentLight; e.currentTarget.style.boxShadow = `0 0 60px ${C.accentLight}60` }}
          onMouseLeave={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.boxShadow = `0 0 40px ${C.accent}50` }}
        >
          Abrir o editor agora
          <ArrowRight size={15}/>
        </Link>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      padding: '32px 40px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Mark size={18}/>
        <span style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontSize: 16, color: C.muted }}>Libretto</span>
      </div>
      <div style={{ fontSize: 12, color: C.faint }}>
        © 2026 Libretto · Feito para escritores
      </div>
      <div style={{ display: 'flex', gap: 24, fontSize: 12, color: C.faint }}>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacidade</a>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Termos</a>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: 'var(--font-geist-sans)' }}>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      <Nav/>
      <Hero/>
      <Features/>
      <Pricing/>
      <FinalCTA/>
      <Footer/>
    </div>
  )
}
