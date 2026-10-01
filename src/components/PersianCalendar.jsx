import { useMemo, useState } from 'react'
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  monthGrid,
  todayJalali,
  toPersianDigits,
} from '../lib/persianDate'

export default function PersianCalendar({
  selected,
  onSelect,
  marks = [], // array of { jy, jm, jd, tone: 'default'|'green'|'clay'|'gold'|'blue' }
}) {
  const today = todayJalali()
  const [vy, setVy] = useState(selected?.jy ?? today.jy)
  const [vm, setVm] = useState(selected?.jm ?? today.jm)

  const grid = useMemo(() => {
    const base = monthGrid(vy, vm)
    const rows = Math.ceil(base.length / 7) * 7
    const padded = [...base]
    while (padded.length < rows) padded.push(null)
    return padded
  }, [vy, vm])

  const markMap = useMemo(() => {
    const map = {}
    marks.forEach((m) => {
      const k = `${m.jy}-${m.jm}-${m.jd}`
      map[k] = m.tone || 'default'
    })
    return map
  }, [marks])

  const goPrev = () => {
    if (vm === 1) { setVm(12); setVy(vy - 1) } else setVm(vm - 1)
  }
  const goNext = () => {
    if (vm === 12) { setVm(1); setVy(vy + 1) } else setVm(vm + 1)
  }
  const goToday = () => { setVy(today.jy); setVm(today.jm); onSelect && onSelect(today) }

  const isToday = (jy, jm, jd) =>
    jy === today.jy && jm === today.jm && jd === today.jd
  const isSelected = (jy, jm, jd) =>
    selected && jy === selected.jy && jm === selected.jm && jd === selected.jd

  return (
    <div className="cal" dir="rtl">
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={goNext} aria-label="ماه بعد">
          ‹
        </button>
        <button type="button" className="cal-title" onClick={goToday} title="برو به امروز" aria-label="رفتن به امروز">
          <span className="cal-month">{MONTH_NAMES[vm - 1]}</span>
          <span className="cal-year">{toPersianDigits(vy)}</span>
        </button>
        <button type="button" className="cal-nav" onClick={goPrev} aria-label="ماه قبل">
          ›
        </button>
      </div>

      <div className="cal-week">
        {WEEKDAY_NAMES.map((d, i) => (
          <span key={i} className={`cal-weekday ${i === 6 ? 'holiday' : ''}`}>{d}</span>
        ))}
      </div>

      <div className="cal-grid">
        {grid.map((c, i) => {
          if (!c) return <div key={`e-${i}`} className="cal-cell empty" />
          const key = `${c.jy}-${c.jm}-${c.jd}`
          const tone = markMap[key]
          const cls = [
            'cal-cell',
            tone ? `tone-${tone}` : '',
            isToday(c.jy, c.jm, c.jd) ? 'today' : '',
            isSelected(c.jy, c.jm, c.jd) ? 'selected' : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={key}
              type="button"
              className={cls}
              onClick={() => onSelect && onSelect(c)}
              aria-label={`${toPersianDigits(c.jd)} ${MONTH_NAMES[c.jm - 1]}`}
              aria-current={isToday(c.jy, c.jm, c.jd) ? 'date' : undefined}
              aria-pressed={isSelected(c.jy, c.jm, c.jd)}
            >
              <span className="cal-num">{toPersianDigits(c.jd)}</span>
              {tone && <span className="cal-dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
