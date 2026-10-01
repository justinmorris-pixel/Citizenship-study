import { useState } from 'react'
import { rpc } from '../lib/supabase'
import { GRAD_CLASSES } from '../config'
import LangToggle from './LangToggle'

export default function Login({ t, lang, setLang, onAuthed }) {
  const [mode, setMode] = useState('login')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [cls, setCls] = useState('')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const errorText = code => ({
    BAD_LOGIN: t('errBadLogin'),
    LOCKED: t('errLocked'),
    NAME_TAKEN: t('errNameTaken'),
    PIN_FORMAT: t('errPinFormat'),
    NAME_REQUIRED: t('errName'),
    BAD_CLASS: t('errClass'),
  }[code] || t('errGeneric'))

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!first.trim() || !last.trim()) return setErr(t('errName'))
    if (!/^\d{4}$/.test(pin)) return setErr(t('errPinFormat'))
    if (mode === 'register' && !cls) return setErr(t('errClass'))
    setBusy(true)
    try {
      const res = mode === 'login'
        ? await rpc('cit_login', { p_first: first, p_last: last, p_pin: pin })
        : await rpc('cit_register', { p_first: first, p_last: last, p_class: Number(cls), p_pin: pin })
      if (res?.error) setErr(errorText(res.error))
      else onAuthed(res.token)
    } catch {
      setErr(t('errGeneric'))
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-3"><LangToggle lang={lang} setLang={setLang} /></div>
        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🇺🇸</div>
            <h1 className="text-2xl font-extrabold text-blue-900">{t('appTitle')}</h1>
            <p className="text-slate-500 mt-1">{t('tagline')}</p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input className={input} placeholder={t('firstName')} value={first} onChange={e => setFirst(e.target.value)} autoComplete="given-name" maxLength={40} />
            <input className={input} placeholder={t('lastName')} value={last} onChange={e => setLast(e.target.value)} autoComplete="family-name" maxLength={40} />
            {mode === 'register' && (
              <select className={input} value={cls} onChange={e => setCls(e.target.value)}>
                <option value="">{t('chooseClass')}</option>
                {GRAD_CLASSES.map(c => <option key={c} value={c}>{t('gradClass')}: {c}</option>)}
              </select>
            )}
            <input
              className={`${input} tracking-[0.5em] text-center`}
              placeholder={t('pin')}
              type="password"
              inputMode="numeric"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            />
            {mode === 'register' && <p className="text-sm text-slate-500">{t('pinHelp')}</p>}
            {err && <p className="text-red-600 text-sm font-medium bg-red-50 rounded-lg px-3 py-2">{err}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-lg font-bold py-3 transition">
              {busy ? t('loading') : mode === 'login' ? t('login') : t('register')}
            </button>
          </form>
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr('') }}
            className="mt-4 w-full text-center text-blue-700 font-medium hover:underline"
          >
            {mode === 'login' ? t('needAccount') : t('haveAccount')}
          </button>
        </div>
      </div>
    </div>
  )
}
