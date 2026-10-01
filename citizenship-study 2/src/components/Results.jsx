import { QUESTIONS_BY_ID, levelInfo } from '../lib/game'
import { PASSING_PERCENT } from '../config'

export default function Results({ t, lang, result, onHome }) {
  const total = result.answers.length
  const correct = result.answers.filter(a => a.c).length
  const pct = Math.round((100 * correct) / total)
  const missed = result.answers.filter(a => !a.c).map(a => QUESTIONS_BY_ID[a.q])
  const isTest = result.mode === 'test'
  const passed = pct >= PASSING_PERCENT
  const leveledUp = result.saved && levelInfo(result.newXp).level > levelInfo(result.prevXp).level
  const perfect = !isTest && correct === total

  return (
    <div className="max-w-2xl mx-auto p-4 pb-12 space-y-4">
      <div className="bg-white rounded-3xl shadow-lg p-6 text-center">
        <div className="text-6xl">{isTest ? (passed ? '🎓' : '📚') : perfect ? '🏆' : pct >= 70 ? '🎉' : '💪'}</div>
        <h1 className="text-2xl font-extrabold mt-2">{isTest ? t('testComplete') : t('roundComplete')}</h1>
        <p className="text-5xl font-black text-blue-800 mt-3">{correct}/{total}</p>
        <p className="text-slate-500">{t('score')}: {pct}%</p>

        {perfect && <p className="mt-2 font-bold text-yellow-600">⭐ {t('perfect')}</p>}
        {isTest && (
          <p className={`mt-3 font-semibold ${passed ? 'text-green-700' : 'text-orange-700'}`}>
            {passed ? t('passed') : t('notYet')} <span className="text-slate-500 font-normal">({t('passNeeded', { p: PASSING_PERCENT })})</span>
          </p>
        )}

        {result.saved ? (
          <p className="mt-3 inline-block bg-yellow-100 text-yellow-800 font-bold rounded-full px-4 py-1">{t('xpEarned', { n: result.xpEarned })}</p>
        ) : (
          <p className="mt-3 text-red-600 text-sm">{t('notSaved')}</p>
        )}
        {leveledUp && <p className="mt-2 font-bold text-blue-700">🚀 {t('levelUp', { n: levelInfo(result.newXp).level })}</p>}

        <div className="mt-5 flex gap-3 justify-center flex-wrap">
          <button onClick={onHome} className="rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold px-6 py-2.5">{t('backHome')}</button>
        </div>
      </div>

      {missed.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-bold text-lg mb-3">{t('missedQuestions')}</h2>
          <ul className="space-y-3">
            {missed.map(q => (
              <li key={q.id} className="border-l-4 border-red-300 pl-3">
                <p className="font-semibold">{q[lang].q}</p>
                <p className="text-sm text-green-700 mt-0.5">✅ {q[lang].options[q.answer]}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
