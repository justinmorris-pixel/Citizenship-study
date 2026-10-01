import { useEffect, useMemo, useRef, useState } from 'react'
import { QUESTIONS } from '../data/questions'
import { TOPICS, levelInfo, statsMap, weightedSample, shuffle } from '../lib/game'
import { RUN_GATE_EVERY, RUN_FIRST_GATE_AFTER } from '../config'
import { createState, step, jump, answerGate, score as calcScore, W, H, STEP } from '../game/runner'
import { draw, drawHero, HEROES } from '../game/draw'
import LangToggle from './LangToggle'

function HeroPreview({ hero, locked }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    const dpr = window.devicePixelRatio || 1
    c.width = 64 * dpr
    c.height = 84 * dpr
    const ctx = c.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, 64, 84)
    drawHero(ctx, 32, 78, 0.5, hero)
  }, [hero])
  return <canvas ref={ref} style={{ width: 64, height: 84, filter: locked ? 'grayscale(1) brightness(0.8)' : 'none' }} />
}

export default function RunnerGame({ t, lang, setLang, profile, onSave, onExit }) {
  const stats = useMemo(() => statsMap(profile.stats), [profile])
  const level = levelInfo(profile.student.xp).level
  const bestStored = useMemo(
    () => Math.max(0, ...(profile.rounds || []).filter(r => r.mode === 'run').map(r => r.score || 0)),
    [profile]
  )

  const [phase, setPhase] = useState('setup')      // setup | playing | question | over
  const [heroId, setHeroId] = useState(() => localStorage.getItem('cit_hero') || 'washington')
  const [topic, setTopic] = useState('all')
  const [question, setQuestion] = useState(null)   // { q, order }
  const [picked, setPicked] = useState(null)       // { idx, correct }
  const [peek, setPeek] = useState(false)
  const [over, setOver] = useState(null)

  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const phaseRef = useRef('setup')
  const queueRef = useRef([])
  const poolRef = useRef(QUESTIONS)
  const answersRef = useRef([])
  const timerRef = useRef(null)
  const saveRef = useRef(onSave)
  saveRef.current = onSave
  const bestRef = useRef(bestStored)
  bestRef.current = Math.max(bestRef.current, bestStored)

  const hero = HEROES.find(h => h.id === heroId && h.unlock <= level) || HEROES[0]
  const heroRef = useRef(hero)
  heroRef.current = hero

  function go(p) {
    phaseRef.current = p
    setPhase(p)
  }

  function startGame() {
    localStorage.setItem('cit_hero', hero.id)
    poolRef.current = topic === 'all' ? QUESTIONS : QUESTIONS.filter(q => q.topic === topic)
    queueRef.current = weightedSample(poolRef.current, stats, poolRef.current.length)
    gameRef.current = createState({ gateEvery: RUN_GATE_EVERY, firstGateAfter: RUN_FIRST_GATE_AFTER })
    answersRef.current = []
    setOver(null)
    setQuestion(null)
    setPicked(null)
    go('playing')
  }

  function openGate() {
    if (queueRef.current.length === 0) queueRef.current = shuffle(poolRef.current)
    const q = queueRef.current.shift()
    setQuestion({ q, order: q.fixed ? [0, 1, 2, 3] : shuffle([0, 1, 2, 3]) })
    setPicked(null)
    setPeek(false)
    go('question')
  }

  async function endGame(reason, missedQ) {
    const s = gameRef.current
    const finalScore = calcScore(s)
    const isBest = finalScore > bestRef.current
    if (isBest) bestRef.current = finalScore
    const answers = answersRef.current
    go('over')
    setOver({ reason, score: finalScore, correct: s.correct, missedQ, isBest, xp: null, saving: answers.length > 0 })
    if (answers.length > 0) {
      const res = await saveRef.current('run', answers, finalScore)
      setOver(o => (o ? { ...o, xp: res.saved ? res.xpEarned : null, saving: false, saveFailed: !res.saved } : o))
    }
  }

  function answer(idx) {
    if (phaseRef.current !== 'question' || picked) return
    const q = question.q
    const correct = idx === q.answer
    answersRef.current = [...answersRef.current, { q: q.id, c: correct }]
    setPicked({ idx, correct })
    answerGate(gameRef.current, correct)
    timerRef.current = setTimeout(() => {
      if (correct) {
        setQuestion(null)
        setPicked(null)
        go('playing')
      } else {
        setQuestion(null)
        setPicked(null)
        endGame('wrong', q)
      }
    }, correct ? 650 : 1800)
  }

  async function quit() {
    if (phaseRef.current === 'playing' || phaseRef.current === 'question') {
      if (!window.confirm(t('quitConfirm'))) return
      clearTimeout(timerRef.current)
      const answers = answersRef.current
      phaseRef.current = 'over'
      if (answers.length > 0) saveRef.current('run', answers, calcScore(gameRef.current))
    }
    onExit()
  }

  // game loop + drawing
  useEffect(() => {
    if (phase === 'setup') return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    let raf
    let last = performance.now()
    let acc = 0
    const frame = now => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const s = gameRef.current
      if (s && phaseRef.current === 'playing') {
        acc += dt
        while (acc >= STEP) {
          acc -= STEP
          const ev = step(s, STEP)
          if (ev === 'gate') { acc = 0; openGate(); break }
          if (ev === 'crash') { acc = 0; endGame('crash'); break }
        }
      } else {
        acc = 0
      }
      if (s) draw(ctx, s, { hero: heroRef.current, best: bestRef.current, answered: s.correct })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase === 'setup']) // eslint-disable-line

  // keyboard
  useEffect(() => {
    const onKey = e => {
      if (phaseRef.current !== 'playing') return
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault()
        jump(gameRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(timerRef.current) }
  }, [])

  const topicLabel = id => (id === 'all' ? t('topicAll') : TOPICS.find(x => x.id === id)[lang])
  const card = 'bg-white rounded-2xl shadow p-5'

  // ---------- Setup screen ----------
  if (phase === 'setup') {
    return (
      <div className="max-w-2xl mx-auto p-4 pb-12 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={onExit} className="text-sm text-slate-500 hover:text-slate-800 underline">← {t('backHome')}</button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <div className="bg-gradient-to-br from-blue-800 to-red-700 text-white rounded-3xl shadow-lg p-6">
          <h1 className="text-2xl font-extrabold">🏃 {t('runnerTitle')}</h1>
          <p className="text-blue-100 mt-1">{t('runnerDesc')}</p>
          <ul className="mt-3 text-sm space-y-1 text-blue-50">
            <li>• {t('runRules1')}</li>
            <li>• {t('runRules2')}</li>
            <li>• {t('runRules3')}</li>
          </ul>
          <p className="mt-3 text-sm font-semibold">{t('runBest')}: {bestStored > 0 ? bestStored : t('noRunsYet')}</p>
        </div>

        <div className={card}>
          <h2 className="font-bold text-lg mb-3">{t('chooseHero')}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {HEROES.map(h => {
              const locked = h.unlock > level
              const selected = hero.id === h.id
              return (
                <button
                  key={h.id}
                  disabled={locked}
                  onClick={() => setHeroId(h.id)}
                  className={`rounded-xl border-2 p-2 flex flex-col items-center text-center transition ${selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'} ${locked ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-400'}`}
                >
                  <HeroPreview hero={h} locked={locked} />
                  <span className="text-xs font-semibold leading-tight mt-1">{h.name}</span>
                  {locked && <span className="text-[10px] text-slate-500 mt-0.5">🔒 {t('unlocksAt', { n: h.unlock })}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className={card}>
          <label className="font-bold text-lg block mb-2">{t('chooseTopic')}</label>
          <select value={topic} onChange={e => setTopic(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg bg-white">
            {['all', ...TOPICS.map(x => x.id)].map(id => <option key={id} value={id}>{topicLabel(id)}</option>)}
          </select>
        </div>

        <button onClick={startGame} className="w-full rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xl font-extrabold py-4 shadow transition">
          {t('startRun')}
        </button>
        <p className="text-center text-sm text-slate-500">{t('jumpHelp')}</p>
      </div>
    )
  }

  // ---------- Playing / question / game over ----------
  const q = question?.q
  const other = lang === 'en' ? 'es' : 'en'

  return (
    <div className="max-w-3xl mx-auto p-4 pb-12 space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={quit} className="text-sm text-slate-500 hover:text-slate-800 underline">{t('quit')}</button>
        <span className="text-sm font-semibold text-slate-600">🏃 {t('runnerTitle')} · {hero.name}</span>
        <LangToggle lang={lang} setLang={setLang} />
      </div>

      <div className="rounded-2xl overflow-hidden shadow-lg border-2 border-slate-300 bg-white select-none">
        <canvas
          ref={canvasRef}
          onPointerDown={() => { if (phaseRef.current === 'playing') jump(gameRef.current) }}
          style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block', touchAction: 'none', cursor: 'pointer' }}
        />
      </div>
      {phase === 'playing' && <p className="text-center text-sm text-slate-500">{t('jumpHelp')}</p>}

      {/* Question gate */}
      {phase === 'question' && q && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-red-600">🚧 {t('questionGate')}</p>
            <h2 className="text-xl sm:text-2xl font-bold leading-snug mt-1">{q[lang].q}</h2>
            <button onClick={() => setPeek(p => !p)} className="mt-1 text-sm text-blue-700 hover:underline">
              🌐 {peek ? t('hideOther') : t('showOther')}
            </button>
            {peek && (
              <div className="mt-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
                <p className="font-semibold">{q[other].q}</p>
                <ul className="list-disc ml-5 mt-1 space-y-0.5">
                  {question.order.map(o => <li key={o}>{q[other].options[o]}</li>)}
                </ul>
              </div>
            )}
            <div className="mt-3 space-y-2">
              {question.order.map(o => {
                let cls = 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50'
                if (picked) {
                  if (o === q.answer) cls = 'border-green-500 bg-green-50 font-semibold'
                  else if (o === picked.idx) cls = 'border-red-400 bg-red-50'
                  else cls = 'border-slate-200 bg-white opacity-50'
                }
                return (
                  <button key={o} onClick={() => answer(o)} className={`w-full text-left rounded-xl border-2 px-4 py-3 text-base sm:text-lg transition ${cls}`}>
                    {q[lang].options[o]}
                  </button>
                )
              })}
            </div>
            <p className={`mt-3 text-sm font-semibold ${picked ? (picked.correct ? 'text-green-700' : 'text-red-700') : 'text-slate-500'}`}>
              {picked ? (picked.correct ? `✅ ${t('gateOk')}` : `❌ ${t('wrongMsg')}`) : t('pickAnswer')}
            </p>
          </div>
        </div>
      )}

      {/* Game over */}
      {phase === 'over' && over && (
        <div className="bg-white rounded-3xl shadow-lg p-6 text-center">
          <div className="text-5xl">{over.reason === 'wrong' ? '📚' : '💥'}</div>
          <h2 className="text-2xl font-extrabold mt-1">{t('gameOver')}</h2>
          <p className="text-slate-600">{over.reason === 'wrong' ? t('wrongMsg') : t('crashMsg')}</p>
          <p className="text-5xl font-black text-blue-800 mt-3">{over.score}</p>
          <p className="text-slate-500">{t('runScore')} · {t('correctCount')}: {over.correct}</p>
          {over.isBest && <p className="mt-2 font-bold text-yellow-600">🏆 {t('newBest')}</p>}
          <p className="mt-3 text-sm">
            {over.saving && <span className="text-slate-500">{t('savingXp')}</span>}
            {!over.saving && over.xp !== null && <span className="inline-block bg-yellow-100 text-yellow-800 font-bold rounded-full px-4 py-1">{t('xpEarned', { n: over.xp })}</span>}
            {over.saveFailed && <span className="text-red-600">{t('notSaved')}</span>}
          </p>

          {over.missedQ && (
            <div className="mt-4 text-left border-l-4 border-red-300 pl-3">
              <p className="text-xs font-bold text-slate-500 uppercase">{t('youMissed')}</p>
              <p className="font-semibold">{over.missedQ[lang].q}</p>
              <p className="text-sm text-green-700 mt-0.5">✅ {over.missedQ[lang].options[over.missedQ.answer]}</p>
            </div>
          )}

          <div className="mt-5 flex gap-3 justify-center flex-wrap">
            <button onClick={startGame} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5">{t('runAgain')}</button>
            <button onClick={() => { go('setup'); setOver(null) }} className="rounded-xl bg-slate-200 hover:bg-slate-300 font-bold px-5 py-2.5">{t('changeSettings')}</button>
            <button onClick={onExit} className="rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold px-5 py-2.5">{t('backHome')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
