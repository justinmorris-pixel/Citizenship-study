import { useCallback, useEffect, useState } from 'react'
import { rpc, hasConfig } from './lib/supabase'
import { makeT } from './lib/i18n'
import Login from './components/Login'
import Home from './components/Home'
import Quiz from './components/Quiz'
import Results from './components/Results'
import RunnerGame from './components/RunnerGame'
import Teacher from './components/Teacher'

const SESSION_KEY = 'cit_token'
const LANG_KEY = 'cit_lang'

export default function App() {
  const [hash, setHash] = useState(window.location.hash)
  const [lang, setLangState] = useState(localStorage.getItem(LANG_KEY) === 'es' ? 'es' : 'en')
  const [token, setToken] = useState(localStorage.getItem(SESSION_KEY) || '')
  const [profile, setProfile] = useState(null)
  const [booting, setBooting] = useState(Boolean(localStorage.getItem(SESSION_KEY)))
  const [view, setView] = useState('home')
  const [quiz, setQuiz] = useState(null)
  const [result, setResult] = useState(null)
  const t = makeT(lang)

  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function setLang(l) {
    localStorage.setItem(LANG_KEY, l)
    setLangState(l)
  }

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setToken('')
    setProfile(null)
    setView('home')
    setQuiz(null)
    setResult(null)
  }, [])

  const loadProgress = useCallback(async tk => {
    const res = await rpc('cit_get_progress', { p_token: tk })
    if (res?.error) throw new Error(res.error)
    setProfile(res)
  }, [])

  useEffect(() => {
    if (!token || !hasConfig) { setBooting(false); return }
    setBooting(true)
    loadProgress(token)
      .catch(() => logout())
      .finally(() => setBooting(false))
  }, [token, loadProgress, logout])

  function onAuthed(tk) {
    localStorage.setItem(SESSION_KEY, tk)
    setToken(tk)
  }

  function startQuiz(cfg) {
    setQuiz(cfg)
    setResult(null)
    setView('quiz')
    window.scrollTo(0, 0)
  }

  // Saves a finished round (also used by the Founders' Run game).
  async function saveRound(mode, answers, score = null) {
    try {
      const res = await rpc('cit_record_round', { p_token: token, p_mode: mode, p_language: lang, p_answers: answers, p_score: score })
      if (res?.error) throw new Error(res.error)
      await loadProgress(token)
      return { saved: true, xpEarned: res.xp_earned }
    } catch {
      return { saved: false, xpEarned: 0 }
    }
  }

  async function finishQuiz(answers) {
    const prevXp = profile.student.xp
    const { saved, xpEarned } = await saveRound(quiz.mode, answers)
    setResult({ mode: quiz.mode, answers, xpEarned, saved, prevXp, newXp: prevXp + xpEarned })
    setView('results')
    window.scrollTo(0, 0)
  }

  if (!hasConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow p-6 max-w-md">
          <h1 className="text-xl font-bold mb-2">{t('setupTitle')}</h1>
          <p className="text-slate-600">{t('setupText')}</p>
        </div>
      </div>
    )
  }

  if (hash.startsWith('#/teacher')) return <Teacher />

  if (booting) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">{t('loading')}</div>
  }

  if (!token || !profile) {
    return <Login t={t} lang={lang} setLang={setLang} onAuthed={onAuthed} />
  }

  if (view === 'quiz' && quiz) {
    return (
      <Quiz
        key={quiz.questions.map(q => q.id).join('-')}
        t={t} lang={lang} mode={quiz.mode} title={quiz.title} questions={quiz.questions}
        onFinish={finishQuiz}
        onQuit={() => setView('home')}
      />
    )
  }

  if (view === 'runner') {
    return (
      <RunnerGame
        t={t} lang={lang} setLang={setLang} profile={profile}
        onSave={saveRound}
        onExit={() => { setView('home'); window.scrollTo(0, 0) }}
      />
    )
  }

  if (view === 'results' && result) {
    return (
      <Results
        t={t} lang={lang} result={result}
        onHome={() => setView('home')}
      />
    )
  }

  return <Home t={t} lang={lang} setLang={setLang} profile={profile} onStart={startQuiz} onRunner={() => { setView('runner'); window.scrollTo(0, 0) }} onLogout={logout} />
}
