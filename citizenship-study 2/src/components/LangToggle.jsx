export default function LangToggle({ lang, setLang }) {
  const base = 'px-3 py-1 text-sm font-semibold rounded-full transition'
  return (
    <div className="inline-flex bg-slate-200 rounded-full p-0.5" role="group" aria-label="Language">
      <button onClick={() => setLang('en')} className={`${base} ${lang === 'en' ? 'bg-white shadow text-blue-700' : 'text-slate-600'}`}>English</button>
      <button onClick={() => setLang('es')} className={`${base} ${lang === 'es' ? 'bg-white shadow text-blue-700' : 'text-slate-600'}`}>Español</button>
    </div>
  )
}
