'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { updatePassword } from '@/lib/services/auth'

const C = {
  bg: '#0a0907', surface: '#141109', card: '#1a1610',
  border: '#2a2218', text: '#f0e8d6', muted: '#9a8870', faint: '#4a3c2e',
  accent: '#c8720a',
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 8) { setError('A senha deve ter no mínimo 8 caracteres.'); return }
    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => router.push('/books'), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar senha.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px 11px 36px', borderRadius: 8,
    border: `1px solid ${C.border}`, background: C.surface, color: C.text,
    fontSize: 14, outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '36px 32px' }}>

          {done ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle size={40} style={{ color: '#4ade80', margin: '0 auto 16px' }} />
              <p style={{ color: C.text, fontWeight: 600, marginBottom: 8 }}>Senha atualizada!</p>
              <p style={{ color: C.muted, fontSize: 13 }}>Redirecionando para seus livros…</p>
            </div>
          ) : (
            <>
              <h1 style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Nova senha</h1>
              <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Escolha uma senha com no mínimo 8 caracteres.</p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>Nova senha</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres" required
                      style={{ ...inputStyle, paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.faint }}>
                      {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>Confirmar senha</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="Repita a senha" required
                      style={inputStyle}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{ background: '#2a1010', border: '1px solid #5a2020', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f08080' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    padding: '12px', borderRadius: 9, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    background: loading ? C.faint : C.accent, color: '#fff', fontSize: 14, fontWeight: 600,
                  }}
                >
                  {loading ? 'Salvando…' : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
