import { useMemo, useState } from 'react'
import { shuffle } from '../lib/game'

export default function Quiz({ t, lang, mode, title, questions, onFinish, onQuit }) {
  const isTest = mode === 'test'
  const orders = useMemo(() => questions.map(q => (q.fixed ? [0, 1, 2, 3] : shuffle([0, 1, 2, 3]))), [questions])
  const [i, setI] = useState(0)
  const [sel, setSel] = useState(null)
  const [answers, setAnswers] = useState([])
  const [combo, setCombo] = useState(0)
  const [peek, setPeek] = useState(false)

  const q = questions[i]
  const order = orders[i]
  const other = lang === 'en' ? 'es' : 'en'
  const revealed = !isTest && sel !== null
  const last = i + 1 >= questions.length

  function choose(idx) {
    if (revealed) return
    setSel(idx)
    if (!isTest) setCombo(c => (idx === q.answer ? c + 1 : 0))
  }

  function next() {
    if (sel === null) return
    const all = [...answers, { q: q.id, c: sel === q.answer }]
    if (last) {
      onFinish(all)
    } else {
      setAnswers(all)
      setI(i + 1)
      setSel(null)
      setPeek(false)
    }
  }

  function quit() {
    if (window.confirm(t('quitConfirm'))) onQuit()
  }

  function optionClass(o) {
    const base = 'w-full text-left rounded-xl border-2 px-4 py-3 text-base sm:text-lg transition '
    if (revealed) {
      if (o === q.answer) return base + 'border-green-500 bg-green-50 font-semibold'
      if (o === sel) return base + 'border-red-400 bg-red-50'
      return base + 'border-slate-200 bg-white opacity-60'
    }
    if (sel === o) return base + 'border-blue-600 bg-blue-50 font-semibold'
    return base + 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50'
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-12">
      <div className="flex items-center justify-between mb-3">
        <button onClick={quit} className="text-sm text-slate-500 hover:text-slate-800 underline">{t('quit')}</button>
        <span className="text-sm font-semibold text-slate-600 text-center">{title}</span>
        <span className="text-sm font-bold text-orange-600 w-12 text-right">{combo >= 2 ? `🔥${combo}` : ''}</span>
      </div>

      <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${(100 * i) / questions.length}%` }} />
      </div>
      <p className="text-xs text-slate-500 mb-4">{t('questionOf', { n: i + 1, total: questions.length })}</p>

      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-xl sm:text-2xl font-bold leading-snug">{q[lang].q}</h2>

        <button onClick={() => setPeek(p => !p)} className="mt-2 text-sm text-blue-700 hover:underline">
          🌐 {peek ? t('hideOther') : t('showOther')}
        </button>
        {peek && (
          <div className="mt-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
            <p className="font-semibold">{q[other].q}</p>
            <ul className="list-disc ml-5 mt-1 space-y-0.5">
              {order.map(o => <li key={o}>{q[other].options[o]}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {order.map(o => (
            <button key={o} onClick={() => choose(o)} className={optionClass(o)}>
              {q[lang].options[o]}
            </button>
          ))}
        </div>

        {revealed && (
          <div className={`mt-4 rounded-xl p-3 ${sel === q.answer ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
            <p className="font-bold">{sel === q.answer ? `✅ ${t('correct')}` : `❌ ${t('wrong')}`}</p>
            {sel !== q.answer && <p className="text-sm mt-1">{t('correctAnswerIs')} <strong>{q[lang].options[q.answer]}</strong></p>}
          </div>
        )}
      </div>

      <button
        onClick={next}
        disabled={sel === null}
        className="mt-4 w-full rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-lg font-bold py-3 transition"
      >
        {last ? t('finish') : t('next')}
      </button>
    </div>
  )
}
