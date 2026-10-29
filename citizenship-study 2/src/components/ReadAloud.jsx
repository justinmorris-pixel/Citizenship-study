import { isSpeechSupported } from '../lib/speech'

export default function ReadAloud({ speech, text, t, lang }) {
  if (!isSpeechSupported()) return null
  const box = 'text-sm text-slate-600 flex items-center gap-1.5 cursor-pointer'
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        onClick={() => (speech.speaking ? speech.stop() : speech.speak(text))}
        className="rounded-full border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm px-4 py-1.5 transition"
      >
        {speech.speaking ? `⏹ ${t('stopReading')}` : `🔊 ${t('readAloud')}`}
      </button>
      <label className={box}>
        <input type="checkbox" checked={speech.auto} onChange={e => { speech.setAuto(e.target.checked); if (e.target.checked && !speech.speaking) speech.speak(text) }} className="accent-red-600" />
        {t('autoRead')}
      </label>
      <label className={box}>
        <input type="checkbox" checked={speech.slow} onChange={e => speech.setSlow(e.target.checked)} className="accent-red-600" />
        {t('slowRead')}
      </label>
      {!speech.hasVoice && (
        <p className="w-full text-xs text-orange-700">{t('noVoice', { l: lang === 'es' ? t('spanishWord') : t('englishWord') })}</p>
      )}
    </div>
  )
}
