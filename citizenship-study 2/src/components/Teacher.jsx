import { useEffect, useMemo, useState } from 'react'
import { rpc } from '../lib/supabase'
import { QUESTIONS, } from '../data/questions'
import { QUESTIONS_BY_ID, TOPICS, levelInfo, statsMap, isMastered } from '../lib/game'
import { PASSING_PERCENT } from '../config'

const PASS_KEY = 'cit_teacher_pass'

function daysAgo(iso) {
  if (!iso) return null
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return Math.max(d, 0)
}
function lastActiveText(iso) {
  const d = daysAgo(iso)
  if (d === null) return 'Never'
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d} days ago`
}
const accuracy = s => (s.seen > 0 ? Math.round((100 * s.correct) / s.seen) : null)

export default function Teacher() {
  const [pass, setPass] = useState(sessionStorage.getItem(PASS_KEY) || '')
  const [input, setInput] = useState('')
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [cls, setCls] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'last_name', dir: 'asc' })
  const [selected, setSelected] = useState(null)

  async function load(p = pass) {
    setBusy(true)
    setErr('')
    try {
      const res = await rpc('cit_dashboard', { p_pass: p })
      if (res?.error) {
        sessionStorage.removeItem(PASS_KEY)
        setPass('')
        setRows(null)
        setErr('Incorrect passphrase.')
      } else {
        sessionStorage.setItem(PASS_KEY, p)
        setPass(p)
        setRows(res.students)
      }
    } catch {
      setErr('Could not reach the database. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { if (pass) load(pass) }, []) // eslint-disable-line

  function logout() {
    sessionStorage.removeItem(PASS_KEY)
    setPass('')
    setRows(null)
    setSelected(null)
  }

  const classes = useMemo(() => [...new Set((rows || []).map(r => r.grad_class))].sort(), [rows])

  const visible = useMemo(() => {
    let list = rows || []
    if (cls !== 'all') list = list.filter(r => String(r.grad_class) === cls)
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      list = list.filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(s))
    }
    const val = r => {
      switch (sort.key) {
        case 'name': return `${r.last_name} ${r.first_name}`.toLowerCase()
        case 'last_name': return `${r.last_name} ${r.first_name}`.toLowerCase()
        case 'accuracy': return accuracy(r) ?? -1
        case 'best_test': return r.best_test ?? -1
        case 'best_run': return r.best_run ?? -1
        case 'last_active_at': return r.last_active_at ? new Date(r.last_active_at).getTime() : 0
        default: return r[sort.key] ?? 0
      }
    }
    return [...list].sort((a, b) => {
      const x = val(a), y = val(b)
      const c = x < y ? -1 : x > y ? 1 : 0
      return sort.dir === 'asc' ? c : -c
    })
  }, [rows, cls, search, sort])

  const summary = useMemo(() => {
    const list = visible
    const n = list.length
    return {
      n,
      active7: list.filter(r => { const d = daysAgo(r.last_active_at); return d !== null && d <= 7 }).length,
      notStarted: list.filter(r => r.rounds_count === 0).length,
      avgMastered: n ? Math.round(list.reduce((s, r) => s + Number(r.mastered), 0) / n) : 0,
      passed: list.filter(r => r.best_test !== null && Number(r.best_test) >= PASSING_PERCENT).length,
    }
  }, [visible])

  function setSortKey(key) {
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'last_name' ? 'asc' : 'desc' }))
  }

  function exportCsv() {
    const header = ['Last name', 'First name', 'Class', 'Level', 'XP', 'Questions mastered', 'Accuracy %', 'Rounds', 'Full tests taken', 'Best full test %', 'Best Founders Run score', 'Day streak', 'Last active']
    const lines = visible.map(r => [
      r.last_name, r.first_name, r.grad_class, levelInfo(r.xp).level, r.xp, r.mastered,
      accuracy(r) ?? '', r.rounds_count, r.tests_taken, r.best_test ?? '', r.best_run ?? '', r.streak_days,
      r.last_active_at ? new Date(r.last_active_at).toLocaleDateString() : '',
    ])
    const csv = [header, ...lines].map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `citizenship-progress-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---------- Login screen ----------
  if (!rows) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <form
          onSubmit={e => { e.preventDefault(); if (input) load(input) }}
          className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm space-y-4"
        >
          <div className="text-center">
            <div className="text-4xl">📊</div>
            <h1 className="text-2xl font-extrabold text-blue-900 mt-1">Teacher Dashboard</h1>
            <p className="text-slate-500 text-sm">Citizenship Test Study</p>
          </div>
          <input
            type="password"
            autoFocus
            placeholder="Teacher passphrase"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {err && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold py-3">
            {busy ? 'Checking...' : 'Open dashboard'}
          </button>
          <a href="#/" className="block text-center text-sm text-slate-500 hover:underline">Back to student site</a>
        </form>
      </div>
    )
  }

  const th = (key, label, extra = '') => (
    <th
      onClick={() => setSortKey(key)}
      className={`px-3 py-2 text-left font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap hover:text-blue-700 ${extra}`}
    >
      {label}{sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  )

  const stat = (label, value, sub) => (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="text-3xl font-black text-blue-900">{value}</div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto p-4 pb-16 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold text-blue-900">📊 Citizenship Study Dashboard</h1>
        <div className="flex gap-2 items-center">
          <button onClick={() => load()} disabled={busy} className="rounded-lg bg-white shadow px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">{busy ? 'Refreshing...' : '↻ Refresh'}</button>
          <button onClick={exportCsv} className="rounded-lg bg-white shadow px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">⬇ Export CSV</button>
          <button onClick={logout} className="text-sm text-slate-500 underline">Log out</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stat('Students', summary.n)}
        {stat('Active this week', summary.active7, 'practiced in last 7 days')}
        {stat('Not started', summary.notStarted, 'account, no rounds yet')}
        {stat('Avg. mastered', `${summary.avgMastered}/${QUESTIONS.length}`, 'questions per student')}
        {stat('Passed practice test', summary.passed, `${PASSING_PERCENT}% or higher`)}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <select value={cls} onChange={e => setCls(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
          <option value="all">All classes</option>
          {classes.map(c => <option key={c} value={String(c)}>Class of {c}</option>)}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 flex-1 min-w-[10rem]"
        />
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              {th('last_name', 'Student')}
              {th('grad_class', 'Class')}
              {th('xp', 'Level')}
              {th('mastered', 'Mastered')}
              {th('accuracy', 'Accuracy')}
              {th('rounds_count', 'Rounds')}
              {th('best_test', 'Best full test')}
              {th('best_run', "Best run")}
              {th('streak_days', 'Streak')}
              {th('last_active_at', 'Last active')}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">No students yet.</td></tr>
            )}
            {visible.map(r => {
              const acc = accuracy(r)
              const d = daysAgo(r.last_active_at)
              return (
                <tr key={r.id} onClick={() => setSelected(r.id)} className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50 ${selected === r.id ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.last_name}, {r.first_name}</td>
                  <td className="px-3 py-2">{r.grad_class}</td>
                  <td className="px-3 py-2">{levelInfo(r.xp).level}</td>
                  <td className="px-3 py-2 min-w-[8rem]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${(100 * r.mastered) / QUESTIONS.length}%` }} /></div>
                      <span>{r.mastered}/{QUESTIONS.length}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{acc === null ? '—' : `${acc}%`}</td>
                  <td className="px-3 py-2">{r.rounds_count}</td>
                  <td className={`px-3 py-2 font-semibold ${r.best_test === null ? 'text-slate-400' : Number(r.best_test) >= PASSING_PERCENT ? 'text-green-700' : 'text-orange-700'}`}>
                    {r.best_test === null ? '—' : `${r.best_test}%`}
                  </td>
                  <td className="px-3 py-2">{r.best_run === null || r.best_run === undefined ? '—' : r.best_run}</td>
                  <td className="px-3 py-2">{r.streak_days > 0 ? `🔥 ${r.streak_days}` : '—'}</td>
                  <td className={`px-3 py-2 whitespace-nowrap ${d === null || d > 7 ? 'text-red-600' : ''}`}>{lastActiveText(r.last_active_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Click a student to see topic breakdown, most-missed questions, and reset their PIN. "Mastered" = answered right twice in a row.</p>

      {selected && (
        <Detail
          key={selected}
          id={selected}
          pass={pass}
          onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}

function Detail({ id, pass, onClose, onChanged }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    rpc('cit_student_detail', { p_pass: pass, p_id: id })
      .then(res => (res?.error ? setErr('Could not load student.') : setData(res)))
      .catch(() => setErr('Could not load student.'))
  }, [id, pass])

  const stats = useMemo(() => statsMap(data?.stats), [data])

  const topicRows = useMemo(() => TOPICS.map(tp => {
    const qs = QUESTIONS.filter(q => q.topic === tp.id)
    let seen = 0, correct = 0, mastered = 0
    for (const q of qs) {
      const s = stats[q.id]
      if (s) { seen += s.seen; correct += s.correct }
      if (isMastered(s)) mastered++
    }
    return { ...tp, total: qs.length, mastered, acc: seen ? Math.round((100 * correct) / seen) : null }
  }), [stats])

  const mostMissed = useMemo(() => Object.values(stats)
    .map(s => ({ ...s, wrong: s.seen - s.correct }))
    .filter(s => s.wrong > 0 && QUESTIONS_BY_ID[s.question_id])
    .sort((a, b) => b.wrong - a.wrong || a.question_id - b.question_id)
    .slice(0, 8), [stats])

  async function resetPin() {
    const pin = window.prompt('Type a new 4-digit PIN for this student:')
    if (pin === null) return
    if (!/^\d{4}$/.test(pin)) return window.alert('PIN must be exactly 4 numbers.')
    try {
      const res = await rpc('cit_reset_pin', { p_pass: pass, p_id: id, p_pin: pin })
      window.alert(res?.ok ? 'PIN reset. Tell the student their new PIN.' : 'Could not reset the PIN.')
    } catch { window.alert('Could not reset the PIN.') }
  }

  async function remove() {
    const s = data?.student
    if (!window.confirm(`Delete ${s?.first_name} ${s?.last_name} and ALL of their progress? This cannot be undone.`)) return
    try {
      const res = await rpc('cit_delete_student', { p_pass: pass, p_id: id })
      if (res?.ok) onChanged()
      else window.alert('Could not delete the student.')
    } catch { window.alert('Could not delete the student.') }
  }

  const s = data?.student
  const modeName = { quick: 'Quick', topic: 'Topic', missed: 'Missed review', test: 'Full test', run: "Founders' Run" }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-blue-200">
      {err && <p className="text-red-600">{err}</p>}
      {!data && !err && <p className="text-slate-500">Loading...</p>}
      {s && (
        <>
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-extrabold">{s.first_name} {s.last_name}</h2>
              <p className="text-sm text-slate-500">Class of {s.grad_class} · Level {levelInfo(s.xp).level} · {s.xp} XP</p>
            </div>
            <div className="flex gap-2">
              <button onClick={resetPin} className="rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-3 py-1.5">Reset PIN</button>
              <button onClick={remove} className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-3 py-1.5">Delete</button>
              <button onClick={onClose} className="rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-semibold px-3 py-1.5">Close</button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div>
              <h3 className="font-bold mb-2">Topics</h3>
              <div className="space-y-2">
                {topicRows.map(tp => (
                  <div key={tp.id}>
                    <div className="flex justify-between text-sm">
                      <span>{tp.icon} {tp.en}</span>
                      <span className="text-slate-500">{tp.mastered}/{tp.total} mastered · {tp.acc === null ? 'not started' : `${tp.acc}% correct`}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-green-500" style={{ width: `${(100 * tp.mastered) / tp.total}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">Most-missed questions</h3>
              {mostMissed.length === 0 ? (
                <p className="text-sm text-slate-500">No missed questions yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {mostMissed.map(m => {
                    const q = QUESTIONS_BY_ID[m.question_id]
                    return (
                      <li key={m.question_id} className="border-l-4 border-red-300 pl-2">
                        <p className="font-semibold">{q.en.q}</p>
                        <p className="text-slate-500">Missed {m.wrong} of {m.seen} · Answer: {q.en.options[q.answer]}</p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-bold mb-2">Recent rounds</h3>
            {data.rounds.length === 0 ? (
              <p className="text-sm text-slate-500">No rounds yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-slate-500"><th className="py-1 pr-3">Date</th><th className="pr-3">Type</th><th className="pr-3">Language</th><th className="pr-3">Score</th></tr></thead>
                  <tbody>
                    {data.rounds.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="py-1 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="pr-3">{modeName[r.mode] || r.mode}</td>
                        <td className="pr-3">{r.language === 'es' ? 'Español' : 'English'}</td>
                        <td className="pr-3">{r.mode === 'run' ? `${r.correct} right · ${r.score ?? 0} pts` : `${r.correct}/${r.total} (${Math.round((100 * r.correct) / r.total)}%)`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
