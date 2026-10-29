import { useCallback, useEffect, useState } from 'react'

// Read-aloud uses the browser's built-in text-to-speech (free, no account needed).

const AUTO_KEY = 'cit_read_auto'
const SLOW_KEY = 'cit_read_slow'

export const isSpeechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

function pickVoice(lang) {
  if (!isSpeechSupported()) return null
  const prefix = lang === 'es' ? 'es' : 'en'
  const prefs = lang === 'es' ? ['es-us', 'es-mx', 'es-es'] : ['en-us', 'en-gb']
  const voices = window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(prefix))
  if (!voices.length) return null
  for (const p of prefs) {
    const hit = voices.find(v => v.lang.toLowerCase().replace('_', '-') === p)
    if (hit) return hit
  }
  return voices[0]
}

// Answers like "A. Serving on a jury" already have a letter; others get A, B, C, D.
export function optionLabel(text, i) {
  return /^[A-D]\.\s/.test(text) ? '' : 'ABCD'[i]
}

// The text that gets read: the question, then each answer in the order shown on screen.
export function speechText(q, lang, order) {
  const end = p => (/[.?!:]$/.test(p) ? ' ' : '. ')
  let out = q[lang].q
  out += end(out)
  order.forEach((o, i) => {
    const txt = q[lang].options[o]
    const lab = optionLabel(txt, i)
    const piece = lab ? `${lab}. ${txt}` : txt
    out += piece + end(piece)
  })
  return out.trim()
}

export function useSpeech(lang) {
  const [auto, setAutoState] = useState(() => localStorage.getItem(AUTO_KEY) === '1')
  const [slow, setSlowState] = useState(() => localStorage.getItem(SLOW_KEY) === '1')
  const [speaking, setSpeaking] = useState(false)
  const [hasVoice, setHasVoice] = useState(true)

  useEffect(() => {
    if (!isSpeechSupported()) return undefined
    const update = () => setHasVoice(Boolean(pickVoice(lang)))
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [lang])

  useEffect(() => () => { if (isSpeechSupported()) window.speechSynthesis.cancel() }, [])

  const stop = useCallback(() => {
    if (isSpeechSupported()) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  const speak = useCallback(text => {
    if (!isSpeechSupported() || !text) return
    const synth = window.speechSynthesis
    synth.cancel()
    // a short pause after cancel() makes Chrome more reliable
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text)
      const v = pickVoice(lang)
      if (v) { u.voice = v; u.lang = v.lang } else { u.lang = lang === 'es' ? 'es-US' : 'en-US' }
      u.rate = slow ? 0.8 : 0.95
      u.onstart = () => setSpeaking(true)
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      synth.speak(u)
    }, 60)
  }, [lang, slow])

  const setAuto = v => { localStorage.setItem(AUTO_KEY, v ? '1' : '0'); setAutoState(v) }
  const setSlow = v => { localStorage.setItem(SLOW_KEY, v ? '1' : '0'); setSlowState(v) }

  return { auto, setAuto, slow, setSlow, speaking, hasVoice, speak, stop }
}
