import { QUESTIONS } from '../data/questions'
import { MASTER_STREAK, XP_PER_LEVEL, PASSING_PERCENT } from '../config'

export const QUESTIONS_BY_ID = Object.fromEntries(QUESTIONS.map(q => [q.id, q]))

export const TOPICS = [
  { id: 'foundations', icon: '📜', en: 'Constitution & Rights', es: 'Constitución y Derechos' },
  { id: 'government', icon: '🏛️', en: 'Branches of Government', es: 'Ramas del Gobierno' },
  { id: 'powers', icon: '⚖️', en: 'Powers, States & Parties', es: 'Poderes, Estados y Partidos' },
  { id: 'civics', icon: '🗳️', en: 'Citizenship & Voting', es: 'Ciudadanía y Voto' },
  { id: 'founding', icon: '🔔', en: 'Colonial & Founding Era', es: 'Época Colonial y Fundación' },
  { id: 'history', icon: '📚', en: 'American History', es: 'Historia de EE. UU.' },
  { id: 'geography', icon: '🗺️', en: 'Geography & Native Nations', es: 'Geografía y Naciones Nativas' },
  { id: 'symbols', icon: '🇺🇸', en: 'Symbols & Holidays', es: 'Símbolos y Días Festivos' },
]

export const questionsInTopic = id => QUESTIONS.filter(q => q.topic === id)

export function statsMap(rows) {
  const m = {}
  for (const r of rows || []) m[r.question_id] = r
  return m
}

export const isMastered = s => Boolean(s) && s.correct_streak >= MASTER_STREAK

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Questions you missed or haven't seen show up more often; mastered ones show up less.
function weightFor(stat) {
  if (!stat || stat.seen === 0) return 3
  if (isMastered(stat)) return 1
  if (stat.last_correct === false) return 6
  return 2
}

export function weightedSample(pool, stats, n) {
  const items = pool.map(q => ({ q, w: weightFor(stats[q.id]) }))
  const out = []
  while (out.length < n && items.length) {
    const total = items.reduce((s, i) => s + i.w, 0)
    let r = Math.random() * total
    let idx = 0
    for (; idx < items.length; idx++) {
      r -= items[idx].w
      if (r <= 0) break
    }
    if (idx >= items.length) idx = items.length - 1
    out.push(items.splice(idx, 1)[0].q)
  }
  return out
}

export function missedQuestions(stats) {
  return QUESTIONS.filter(q => {
    const s = stats[q.id]
    return s && s.last_correct === false
  })
}

const LEVEL_TITLES = [
  { en: 'Newcomer', es: 'Recién llegado' },
  { en: 'Learner', es: 'Aprendiz' },
  { en: 'Resident', es: 'Residente' },
  { en: 'Neighbor', es: 'Vecino' },
  { en: 'Voter', es: 'Votante' },
  { en: 'Patriot', es: 'Patriota' },
  { en: 'Scholar', es: 'Erudito' },
  { en: 'Founder', es: 'Fundador' },
  { en: 'Statesman', es: 'Estadista' },
  { en: 'Chief Justice', es: 'Juez Supremo' },
]

export function levelInfo(xp, lang = 'en') {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const into = xp % XP_PER_LEVEL
  const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)][lang]
  return { level, into, title, toNext: XP_PER_LEVEL - into, pct: Math.round((into / XP_PER_LEVEL) * 100) }
}

export function topicMasteredCounts(stats) {
  const out = {}
  for (const t of TOPICS) {
    const qs = questionsInTopic(t.id)
    out[t.id] = { mastered: qs.filter(q => isMastered(stats[q.id])).length, total: qs.length }
  }
  return out
}

// Badges are worked out from your progress; nothing extra is stored.
export const BADGES = [
  { id: 'first', icon: '🎯', en: 'First Round', es: 'Primera Ronda',
    den: 'Finish your first round.', des: 'Termina tu primera ronda.',
    earned: c => c.rounds.length >= 1 },
  { id: 'perfect', icon: '💯', en: 'Perfect Round', es: 'Ronda Perfecta',
    den: 'Get every question right in a round.', des: 'Responde todo bien en una ronda.',
    earned: c => c.rounds.some(r => r.mode !== 'test' && r.total >= 5 && r.correct === r.total) },
  { id: 'streak3', icon: '🔥', en: '3-Day Streak', es: 'Racha de 3 Días',
    den: 'Practice 3 days in a row.', des: 'Practica 3 días seguidos.',
    earned: c => c.student.streak_days >= 3 },
  { id: 'streak7', icon: '⚡', en: '7-Day Streak', es: 'Racha de 7 Días',
    den: 'Practice 7 days in a row.', des: 'Practica 7 días seguidos.',
    earned: c => c.student.streak_days >= 7 },
  { id: 'half', icon: '⭐', en: 'Halfway There', es: 'A la Mitad',
    den: 'Master 50 questions.', des: 'Domina 50 preguntas.',
    earned: c => c.masteredCount >= 50 },
  { id: 'topic', icon: '🏅', en: 'Topic Master', es: 'Maestro de un Tema',
    den: 'Master every question in one topic.', des: 'Domina todas las preguntas de un tema.',
    earned: c => Object.values(c.topicCounts).some(t => t.mastered === t.total) },
  { id: 'ready', icon: '🎓', en: 'Test Ready', es: 'Listo para el Examen',
    den: `Score ${PASSING_PERCENT}% or higher on the Full Practice Test.`,
    des: `Saca ${PASSING_PERCENT}% o más en el Examen de Práctica Completo.`,
    earned: c => c.rounds.some(r => r.mode === 'test' && (100 * r.correct) / r.total >= PASSING_PERCENT) },
  { id: 'scholar', icon: '👑', en: 'Citizen Scholar', es: 'Erudito Ciudadano',
    den: 'Master all 99 questions.', des: 'Domina las 99 preguntas.',
    earned: c => c.masteredCount >= QUESTIONS.length },
]

export function earnedBadges(profile) {
  const stats = statsMap(profile.stats)
  const ctx = {
    student: profile.student,
    rounds: profile.rounds || [],
    masteredCount: QUESTIONS.filter(q => isMastered(stats[q.id])).length,
    topicCounts: topicMasteredCounts(stats),
  }
  return BADGES.map(b => ({ ...b, isEarned: b.earned(ctx) }))
}
