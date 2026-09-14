import { useMemo, useState } from 'react'
import {
  TYPE_META,
  COURTS,
  HOURS,
  MINUTES,
  durationOptions,
  timeToFa,
  courtLabel,
} from '../lib/data'
import { PlusIcon } from './icons'
import { formatFull, toPersianDigits, addDaysJalali } from '../lib/persianDate'

const REPEATS = [
  { v: 0, label: 'بدون تکرار' },
  { v: 4, label: '۴ هفته' },
  { v: 8, label: '۸ هفته' },
  { v: 12, label: '۱۲ هفته' },
]

export default function SessionModal({
  date,
  defaultStudentId,
  students,
  allSessions = [],
  editing = null,
  initialHour = null,
  onSave,
  onClose,
}) {
  const [studentId, setStudentId] = useState(editing?.studentId || defaultStudentId || students[0]?.id || '')
  const [hour, setHour] = useState(editing?.hour ?? initialHour ?? 9)
  const [minute, setMinute] = useState(editing?.minute ?? 0)
  const [duration, setDuration] = useState(editing?.duration ?? 60)
  const [type, setType] = useState(editing?.type || 'private')
  const [court, setCourt] = useState(
    () =>
      (editing &&
        (COURTS.find((c) => c.label === editing.court || c.tone === editing.court)?.tone ||
          'clay')) ||
      'clay',
  )
  const [note, setNote] = useState(editing?.note || '')
  const [repeat, setRepeat] = useState(0)

  const dates = useMemo(() => {
    if (repeat > 0 && !editing) {
      return Array.from({ length: repeat }, (_, i) => addDaysJalali(date, i * 7))
    }
    return [date]
  }, [repeat, date, editing])

  const conflicts = useMemo(() => {
    const start = hour * 60 + minute
    const end = start + duration
    const list = []
    dates.forEach((d) => {
      allSessions.forEach((s) => {
        if (editing && s.id === editing.id) return
        if (s.jy !== d.jy || s.jm !== d.jm || s.jd !== d.jd) return
        if (s.studentId !== studentId && s.court !== courtLabel(court)) return
        const sStart = s.hour * 60 + s.minute
        const sEnd = sStart + s.duration
        if (start < sEnd && sStart < end) list.push(s)
      })
    })
    return list
  }, [dates, allSessions, hour, minute, duration, studentId, court, editing])

  const conflictLabels = useMemo(() => {
    const nameOf = (id) => students.find((u) => u.id === id)?.name || 'هنرجو'
    return [...new Set(conflicts.map((s) => `${nameOf(s.studentId)} · ${timeToFa(s.hour, s.minute)}`))]
  }, [conflicts, students])

  const courtMeta = COURTS.find((c) => c.tone === court) || COURTS[0]

  const submit = (e) => {
    e.preventDefault()
    if (!studentId || conflicts.length) return
    const payload = {
      studentId,
      hour,
      minute,
      duration,
      type,
      court: courtLabel(court),
      note: note.trim(),
    }
    if (editing) {
      onSave([{ ...payload, jy: date.jy, jm: date.jm, jd: date.jd }])
      return
    }
    onSave(dates.map((d) => ({ ...payload, jy: d.jy, jm: d.jm, jd: d.jd })))
  }

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="session-modal">
        <div className="modal-head">
          <div>
            <h3>{editing ? 'ویرایش جلسه' : 'برنامه‌ریزی جلسه'}</h3>
            <p className="modal-date">
              {editing && <span className="editing-hint">در حال ویرایش · </span>}
              {editing ? '' : 'روز: '}
              {formatFull(date.jy, date.jm, date.jd)}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="بستن">×</button>
        </div>

        <form onSubmit={submit}>
          <label className="field">
            <span className="field-label">هنرجو</span>
            <div className="field-box">
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </label>

          <div className="session-time-row">
            <div className="time-groups">
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))}>
                {HOURS.map((h) => (
                  <option key={h} value={h}>{toPersianDigits(h)}</option>
                ))}
              </select>
              <span className="colon">:</span>
              <select value={minute} onChange={(e) => setMinute(Number(e.target.value))}>
                {MINUTES.map((m) => (
                  <option key={m} value={m}>{toPersianDigits(String(m).padStart(2, '0'))}</option>
                ))}
              </select>
              <span className="time-sep">ـ</span>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {durationOptions().map((d) => (
                  <option key={d} value={d}>{toPersianDigits(d)} دقیقه</option>
                ))}
              </select>
            </div>
          </div>

          {!editing && (
            <div className="segment" role="tablist" aria-label="تکرار هفتگی">
              {REPEATS.map((r) => (
                <button
                  key={r.v}
                  type="button"
                  className={`seg-btn seg-clay ${repeat === r.v ? 'active' : ''}`}
                  onClick={() => setRepeat(r.v)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          <div className="segment" role="tablist" aria-label="نوع جلسه">
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                className={`seg-btn seg-${meta.tone} ${type === key ? 'active' : ''}`}
                onClick={() => setType(key)}
              >
                {meta.label}
              </button>
            ))}
          </div>

          <div className="segment" role="tablist" aria-label="زمین">
            {COURTS.map((c) => (
              <button
                key={c.tone}
                type="button"
                className={`seg-btn seg-${c.tone} ${court === c.tone ? 'active' : ''}`}
                onClick={() => setCourt(c.tone)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="field-label">یادداشت (اختیاری)</span>
            <div className="field-box">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثلاً: تمرکز روی سرویس"
              />
            </div>
          </label>

          {conflicts.length > 0 && (
            <div className="conflict-warn" role="alert">
              <strong>تداخل زمانی — ثبت ممکن نیست</strong>
              <ul>
                {conflictLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="session-preview">
            <span className={`preview-dot ${courtMeta.tone}`} />
            <span>{courtMeta.label}</span>
            <span className="preview-sep">·</span>
            <span>{timeToFa(hour, minute)}</span>
            <span className="preview-sep">·</span>
            <span>{toPersianDigits(duration)} دقیقه</span>
            {repeat > 0 && !editing && (
              <>
                <span className="preview-sep">·</span>
                <span>{toPersianDigits(repeat)} جلسه</span>
              </>
            )}
          </div>

          <button type="submit" className="btn-primary full" disabled={conflicts.length > 0}>
            <PlusIcon /> {editing ? 'ذخیره تغییرات' : 'ثبت جلسه'}
          </button>
        </form>
      </div>
    </div>
  )
}