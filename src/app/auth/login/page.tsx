'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { signInWithEmail, signUpWithEmail, signInWithGoogle, sendMagicLink, sendPasswordReset } from '@/lib/services/auth'

const C = {
  bg: '#0a0907', surface: '#141109', card: '#1a1610',
  border: '#2a2218', borderLight: '#3a3228',
  text: '#f0e8d6', muted: '#9a8870', faint: '#4a3c2e',
  accent: '#c8720a', accentLight: '#e08c2a',
}

type Tab = 'login' | 'cadastro' | 'magic'

function Mark() {
  return (
    <svg width="28" height="25" viewBox="0 0 40 36" fill="none" aria-hidden>
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

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/books'

  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await signInWithEmail(email, password)
        router.push(next)
      } else if (tab === 'cadastro') {
        await signUpWithEmail(email, password, name)
        router.push(next)
      } else {
        await sendMagicLink(email, next)
        setMagicSent(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado'
      if (msg.includes('Invalid login')) setError('Email ou senha incorretos.')
      else if (msg.includes('already registered')) setError('Este email já está cadastrado. Faça login.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!email) { setError('Preencha o email acima antes de resetar a senha.'); return }
    setError('')
    setLoading(true)
    try {
      await sendPasswordReset(email)
      setResetSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar email de reset.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    try {
      await signInWithGoogle(next)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar com Google')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.surface, color: C.text,
    fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500,
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 36 }}>
        <Mark/>
        <span style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontSize: 22, color: C.text }}>
          Livretto
        </span>
      </Link>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '36px 32px' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 28, border: `1px solid ${C.border}`, borderRadius: 9, padding: 3 }}>
            {([['login', 'Entrar'], ['cadastro', 'Criar conta'], ['magic', 'Magic link']] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setMagicSent(false) }}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 7,
                  fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: tab === t ? C.accent : 'transparent',
                  color: tab === t ? '#fff' : C.muted,
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {magicSent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <p style={{ color: C.text, fontWeight: 600, marginBottom: 8 }}>Verifique seu email</p>
              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
                Enviamos um link de acesso para <strong style={{ color: C.text }}>{email}</strong>.
                Clique no link para entrar.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tab === 'cadastro' && (
                <div>
                  <label style={labelStyle}>Nome</label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                    <input
                      type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome" required
                      style={{ ...inputStyle, paddingLeft: 36 }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com" required autoFocus
                    style={{ ...inputStyle, paddingLeft: 36 }}
                  />
                </div>
              </div>

              {tab !== 'magic' && (
                <div>
                  <label style={labelStyle}>Senha</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder={tab === 'cadastro' ? 'Mínimo 8 caracteres' : '••••••••'}
                      required minLength={tab === 'cadastro' ? 8 : undefined}
                      style={{ ...inputStyle, paddingLeft: 36, paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.faint }}>
                      {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div style={{ background: '#2a1010', border: '1px solid #5a2020', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f08080' }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', borderRadius: 9, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? C.faint : C.accent,
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  transition: 'background 0.2s',
                }}
              >
                {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : tab === 'cadastro' ? 'Criar conta' : 'Enviar link'}
                {!loading && <ArrowRight size={14}/>}
              </button>

              {tab === 'login' && resetSent && (
                <div style={{ background: '#0f2a1a', border: '1px solid #1a5a30', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#6ee7a0', textAlign: 'center' }}>
                  Email enviado! Verifique sua caixa de entrada.
                </div>
              )}

              {tab === 'login' && !resetSent && (
                <button type="button" onClick={handleReset} disabled={loading}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, fontSize: 12, textAlign: 'right', padding: 0, marginTop: -8 }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.muted)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.faint)}
                >
                  Esqueci minha senha
                </button>
              )}

              {tab !== 'magic' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: C.faint, fontSize: 12 }}>
                    <div style={{ flex: 1, height: 1, background: C.border }}/>
                    ou
                    <div style={{ flex: 1, height: 1, background: C.border }}/>
                  </div>

                  <button
                    type="button" onClick={handleGoogle}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      padding: '11px', borderRadius: 9,
                      border: `1px solid ${C.border}`, background: 'transparent',
                      color: C.muted, fontSize: 14, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.color = C.text }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar com Google
                  </button>
                </>
              )}
            </form>
          )}
        </div>

        {/* Continuar sem conta */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/new" style={{ fontSize: 13, color: C.faint, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.muted)}
            onMouseLeave={e => (e.currentTarget.style.color = C.faint)}
          >
            Continuar sem conta — dados ficam apenas neste dispositivo
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  )
}
