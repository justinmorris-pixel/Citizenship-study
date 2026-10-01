import { useMemo } from 'react'
import { QUESTIONS } from '../data/questions'
import {
  TOPICS, levelInfo, weightedSample, shuffle, statsMap, isMastered,
  missedQuestions, questionsInTopic, topicMasteredCounts, earnedBadges,
} from '../lib/game'
import { MASTER_STREAK, QUICK_ROUND_SIZE, TOPIC_ROUND_SIZE, MISSED_ROUND_SIZE, PASSING_PERCENT } from '../config'
import LangToggle from './LangToggle'

export default function Home({ t, lang, setLang, profile, onStart, onLogout }) {
  const { student } = profile
  const stats = useMemo(() => statsMap(profile.stats), [profile])
  const lv = levelInfo(student.xp, lang)
  const masteredCount = QUESTIONS.filter(q => isMastered(stats[q.id])).length
  const missed = useMemo(() => missedQuestions(stats), [stats])
  const topicCounts = useMemo(() => topicMasteredCounts(stats), [stats])
  const badges = useMemo(() => earnedBadges(profile), [profile])
  const streak = student.streak_days || 0

  const card = 'bg-white rounded-2xl shadow p-5'
  const btn = 'rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold px-5 py-2.5 transition disabled:opacity-40 disabled:hover:bg-blue-700'

  return (
    <div className="max-w-3xl mx-auto p-4 pb-12 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <LangToggle lang={lang} setLang={setLang} />
        <button onClick={onLogout} className="text-sm text-slate-500 hover:text-slate-800 underline">{t('logout')}</button>
      </div>

      <div className="bg-gradient-to-br from-blue-800 to-blue-600 text-white rounded-3xl shadow-lg p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-blue-200 text-sm">{student.first_name} {student.last_name}</p>
            <h1 className="text-2xl font-extrabold">{t('level')} {lv.level} · {lv.title}</h1>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-black">{streak > 0 ? '🔥' : '💤'} {streak}</div>
            <div className="text-blue-200 text-xs">{streak === 1 ? t('dayStreakOne') : t('dayStreak')}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-3 bg-blue-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-300 rounded-full transition-all" style={{ width: `${lv.pct}%` }} />
          </div>
          <p className="text-xs text-blue-100 mt-1">{student.xp} {t('xp')} · {t('toNext', { n: lv.toNext })}</p>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold text-lg">{t('mastered')}</h2>
          <span className="text-sm text-slate-500">{t('masteredOf', { a: masteredCount, b: QUESTIONS.length })}</span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(100 * masteredCount) / QUESTIONS.length}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">{t('masteredHelp', { n: MASTER_STREAK })}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className={card}>
          <div className="text-3xl">⚡</div>
          <h2 className="font-bold text-lg mt-1">{t('quickRound')}</h2>
          <p className="text-sm text-slate-500 mb-3">{t('quickRoundDesc')}</p>
          <button className={btn} onClick={() => onStart({ mode: 'quick', title: t('quickRound'), questions: weightedSample(QUESTIONS, stats, QUICK_ROUND_SIZE) })}>{t('start')}</button>
        </div>
        <div className={card}>
          <div className="text-3xl">🔁</div>
          <h2 className="font-bold text-lg mt-1">{t('reviewMissed')}</h2>
          <p className="text-sm text-slate-500 mb-3">{missed.length ? t('reviewMissedDesc', { n: missed.length }) : t('noMissed')}</p>
          <button
            className={btn}
            disabled={!missed.length}
            onClick={() => onStart({ mode: 'missed', title: t('reviewMissed'), questions: shuffle(missed).slice(0, MISSED_ROUND_SIZE) })}
          >{t('start')}</button>
        </div>
      </div>

      <div className={card}>
        <h2 className="font-bold text-lg mb-3">📖 {t('topicPractice')}</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {TOPICS.map(tp => {
            const c = topicCounts[tp.id]
            return (
              <button
                key={tp.id}
                onClick={() => onStart({ mode: 'topic', title: tp[lang], questions: weightedSample(questionsInTopic(tp.id), stats, TOPIC_ROUND_SIZE) })}
                className="text-left rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 p-3 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{tp.icon}</span>
                  <span className="font-semibold leading-tight">{tp[lang]}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-green-500" style={{ width: `${(100 * c.mastered) / c.total}%` }} />
                </div>
                <div className="text-xs text-slate-500 mt-1">{t('topicsMastered', { a: c.mastered, b: c.total })}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className={card}>
        <div className="text-3xl">📝</div>
        <h2 className="font-bold text-lg mt-1">{t('fullTest')}</h2>
        <p className="text-sm text-slate-500 mb-3">{t('fullTestDesc', { p: PASSING_PERCENT })}</p>
        <button className={btn} onClick={() => onStart({ mode: 'test', title: t('fullTest'), questions: shuffle(QUESTIONS) })}>{t('start')}</button>
      </div>

      <div className={card}>
        <h2 className="font-bold text-lg mb-3">🏆 {t('badges')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map(b => (
            <div key={b.id} title={lang === 'en' ? b.den : b.des}
              className={`rounded-xl p-3 text-center border ${b.isEarned ? 'bg-yellow-50 border-yellow-300' : 'bg-slate-100 border-slate-200 opacity-50 grayscale'}`}>
              <div className="text-3xl">{b.icon}</div>
              <div className="text-sm font-semibold leading-tight mt-1">{b[lang]}</div>
              <div className="text-xs text-slate-500 mt-1 leading-tight">{lang === 'en' ? b.den : b.des}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
