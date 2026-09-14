import { useEffect, useMemo, useRef, useState } from 'react'
import { TYPE_META, timeToFa, courtLabel } from '../lib/data'
import {
  WEEKDAY_FULL,
  MONTH_NAMES,
  addDaysJalali,
  dayKey,
  toPersianDigits,
  todayJalali,
  weekdayIndex,
} from '../lib/persianDate'

const START_HOUR = 7
const END_HOUR = 21
const ROW_H = 44

const snap30 = (m) => Math.round(m / 30) * 30
const clamp = (v, a, b) => Math.min(Math.max(v, a), b)
const overlaps = (a1, a2, b1, b2) => a1 < b2 && b1 < a2

function layoutDay(list) {
  const items = list
    .map((s) => ({
      s,
      start: s.hour * 60 + s.minute,
      end: s.hour * 60 + s.minute + s.duration,
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end)
  const laneEnds = []
  items.forEach((it) => {
    const idx = laneEnds.findIndex((e) => it.start >= e)
    if (idx === -1) {
      it.lane = laneEnds.length
      laneEnds.push(it.end)
    } else {
      it.lane = idx
      laneEnds[idx] = it.end
    }
  })
  return { items, laneCount: laneEnds.length }
}

function useIsNarrow() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(max-width: 640px)').matches
      : false,
  )
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia('(max-width: 640px)')
    const fn = (e) => setNarrow(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return narrow
}

const sameDayObj = (a, b) => a.jy === b.jy && a.jm === b.jm && a.jd === b.jd

export default function WeekTimeline({
  sessions,
  allSessions = null,
  users,
  onEdit,
  onCreate,
  onSelectDay,
  onDropUpdate,
  onDragConflict,
}) {
  const today = todayJalali()
  const narrow = useIsNarrow()

  const [weekStart, setWeekStart] = useState(() =>
    addDaysJalali(today, -weekdayIndex(today.jy, today.jm, today.jd)),
  )
  const [agendaDay, setAgendaDay] = useState(() => ({ ...today }))
  const [now, setNow] = useState(() => new Date())
  const [preview, setPreview] = useState(null)

  const cleanupRef = useRef(() => {})
  const dragRef = useRef(null)
  const swipeRef = useRef(null)
  const narrowRef = useRef(false)

  useEffect(() => {
    narrowRef.current = narrow
  }, [narrow])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => {
      clearInterval(t)
      cleanupRef.current()
    }
  }, [])

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysJalali(weekStart, i)),
    [weekStart],
  )

  const userById = useMemo(() => {
    const map = {}
    users.forEach((u) => (map[u.id] = u))
    return map
  }, [users])

  const byDay = useMemo(() => {
    const out = {}
    const all = narrow ? [agendaDay] : days
    all.forEach((d) => {
      const list = sessions.filter(
        (s) => dayKey(s.jy, s.jm, s.jd) === dayKey(d.jy, d.jm, d.jd),
      )
      out[dayKey(d.jy, d.jm, d.jd)] = layoutDay(list)
    })
    return out
  }, [days, sessions, narrow, agendaDay])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const gridH = (END_HOUR - START_HOUR) * ROW_H
  const nowPos = ((nowMinutes - START_HOUR * 60) / 60) * ROW_H
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  const weekTitle = useMemo(() => {
    const first = days[0]
    const last = days[6]
    return first.jm === last.jm
      ? `${toPersianDigits(first.jd)} تا ${toPersianDigits(last.jd)} ${MONTH_NAMES[first.jm - 1]} ${toPersianDigits(first.jy)}`
      : `${toPersianDigits(first.jd)} ${MONTH_NAMES[first.jm - 1]} تا ${toPersianDigits(last.jd)} ${MONTH_NAMES[last.jm - 1]} ${toPersianDigits(last.jy)}`
  }, [days])

  const goToday = () => {
    const sat = addDaysJalali(today, -weekdayIndex(today.jy, today.jm, today.jd))
    setWeekStart(sat)
    setAgendaDay({ ...today })
  }

  /* ---------------- drag engine ---------------- */

  const colIndexAt = (x, cols) => {
    for (let i = 0; i < cols.length; i++) {
      const r = cols[i]
      if (x >= r.left && x <= r.right) return i
    }
    let best = 0
    let bd = Infinity
    cols.forEach((r, i) => {
      const d = x < r.left ? r.left - x : x - r.right
      if (d < bd) { bd = d; best = i }
    })
    return best
  }

  const dropCommit = (s, p) => {
    const list = allSessions || sessions
    const nd = addDaysJalali(weekStart, clamp(p.dayOffset, 0, 6))
    const newStart = p.kind === 'move' ? p.startMin : s.hour * 60 + s.minute
    const newEnd = newStart + p.duration
    if (newStart < START_HOUR * 60 || newEnd > END_HOUR * 60) {
      onDragConflict && onDragConflict('range')
      return
    }
    const targetDay =
      p.kind === 'move' ? { jy: nd.jy, jm: nd.jm, jd: nd.jd } : { jy: s.jy, jm: s.jm, jd: s.jd }
    const clash = list.some((x) => {
      if (x.id === s.id) return false
      if (dayKey(x.jy, x.jm, x.jd) !== dayKey(targetDay.jy, targetDay.jm, targetDay.jd)) return false
      const sameCourt = courtLabel(x.court) === courtLabel(s.court)
      const sameStudent = x.studentId === s.studentId
      if (!sameCourt && !sameStudent) return false
      const xs = x.hour * 60 + x.minute
      return overlaps(newStart, newEnd, xs, xs + x.duration)
    })
    if (clash) {
      onDragConflict && onDragConflict('conflict')
      return
    }
    const patch =
      p.kind === 'move'
        ? { jy: nd.jy, jm: nd.jm, jd: nd.jd, hour: Math.floor(p.startMin / 60), minute: p.startMin % 60 }
        : { duration: p.duration }
    onDropUpdate && onDropUpdate(s.id, patch, p.kind)
  }

  const beginDrag = (e, s, kind) => {
    if (e.button !== undefined && e.button !== 0) return
    if (dragRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const base = {
      id: s.id,
      kind,
      dayOffset: 0,
      startMin: s.hour * 60 + s.minute,
      duration: s.duration,
      moved: false,
    }
    const meta = {
      startX: e.clientX,
      startY: e.clientY,
      origStart: s.hour * 60 + s.minute,
      origDur: s.duration,
    }
    dragRef.current = meta
    setPreview({ ...base, s })

    let raf = 0
    const apply = (x, y) => {
      if (!dragRef.current) return
      if (!base.moved && Math.abs(x - meta.startX) < 5 && Math.abs(y - meta.startY) < 5) return
      base.moved = true
      if (kind === 'resize') {
        base.duration = clamp(
          snap30(meta.origDur + ((y - meta.startY) / ROW_H) * 60),
          30,
          END_HOUR * 60 - meta.origStart,
        )
      } else {
        base.startMin = clamp(
          snap30(meta.origStart + ((y - meta.startY) / ROW_H) * 60),
          START_HOUR * 60,
          END_HOUR * 60 - meta.origDur,
        )
        if (!narrowRef.current) {
          const cols = Array.from(document.querySelectorAll('.wt-day-wrap')).map((el) =>
            el.getBoundingClientRect(),
          )
          base.dayOffset = colIndexAt(x, cols)
        }
      }
      setPreview({ ...base, s })
    }

    const onMove = (ev) => {
      const x = ev.clientX
      const y = ev.clientY
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; apply(x, y) })
    }

    const onUp = () => {
      cleanupRef.current()
      if (raf) cancelAnimationFrame(raf)
      dragRef.current = null
      const wasMoved = base.moved
      setPreview(null)
      if (!wasMoved) {
        onEdit && onEdit(s)
        return
      }
      dropCommit(s, base)
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (raf) cancelAnimationFrame(raf)
      dragRef.current = null
    }
    cleanupRef.current = cleanup
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const dragging = !!(preview && preview.moved)

  /* ---------------- shared block renderer ---------------- */

  const renderBlock = (s, lane, laneCount, isToday, dayIdx) => {
    const isDragged = dragging && preview.id === s.id
    if (isDragged && !narrow && preview.kind === 'move' && preview.dayOffset !== dayIdx)
      return null
    const tm = TYPE_META[s.type]
    const itemStart = s.hour * 60 + s.minute
    const shown = isDragged
      ? { startMin: preview.startMin, duration: preview.duration }
      : { startMin: itemStart, duration: s.duration }
    const top = ((shown.startMin - START_HOUR * 60) / 60) * ROW_H
    const height = Math.max((shown.duration / 60) * ROW_H - 3, 20)
    const live =
      isToday && itemStart <= nowMinutes && nowMinutes < itemStart + s.duration && !isDragged
    const lanePos =
      isDragged && !narrow && preview.kind === 'move'
        ? { insetInlineStart: 3, width: 'calc(100% - 7px)' }
        : {
            insetInlineStart: `calc(${(lane / laneCount) * 100}% + 2px)`,
            width: `calc(${100 / laneCount}% - 5px)`,
          }
    return (
      <div
        key={s.id}
        className={`wt-block tone-${tm.tone} ${live ? 'live' : ''} ${isDragged ? 'dragging' : ''}`}
        style={{ top: top + 1, height, ...lanePos }}
        onPointerDown={(e) => !isDragged && beginDrag(e, s, 'move')}
        title={`${live ? 'در جریان — ' : ''}${timeToFa(s.hour, s.minute)} · ${tm.label} — برای جابه‌جایی بکشید`}
      >
        <span className="wtb-time">{timeToFa(Math.floor(shown.startMin / 60), shown.startMin % 60)}</span>
        <span className="wtb-name">{userById[s.studentId]?.name || '؟'}</span>
        {height >= 64 && <span className="wtb-court">{courtLabel(s.court)}</span>}
        {!isDragged && (
          <span
            className="wtb-grip"
            aria-label="تغییر مدت جلسه"
            onPointerDown={(e) => beginDrag(e, s, 'resize')}
          />
        )}
        {isDragged && (
          <span className="wt-drag-badge">
            {preview.kind === 'resize'
              ? `${toPersianDigits(preview.duration)} دقیقه`
              : timeToFa(Math.floor(preview.startMin / 60), preview.startMin % 60)}
          </span>
        )}
      </div>
    )
  }

  const renderCol = (d, dayIdx, isToday) => {
    const key = dayKey(d.jy, d.jm, d.jd)
    const layout = byDay[key] || { items: [], laneCount: 1 }
    return (
      <div
        className={`wt-col ${!narrow && dragging && preview.kind === 'move' && preview.dayOffset === dayIdx ? 'drop-hover' : ''}`}
        style={{ height: gridH }}
      >
        {hours.map((h) => (
          <button
            key={h}
            type="button"
            className="wt-slot"
            style={{ top: (h - START_HOUR) * ROW_H }}
            aria-label={`جلسه جدید — ساعت ${toPersianDigits(h)}`}
            onClick={() => onCreate && onCreate(d, h)}
          />
        ))}
        {layout.items.map(({ s, lane }) => {
          const laneCount = Math.max(layout.laneCount, 1)
          return renderBlock(s, lane, laneCount, isToday, dayIdx)
        })}
        {isToday && nowPos >= 0 && nowPos <= gridH && (
          <div className="wt-now" style={{ top: nowPos }}>
            <span className="wt-now-dot" />
            <span className="wt-now-label">{timeToFa(now.getHours(), now.getMinutes())}</span>
          </div>
        )}
      </div>
    )
  }

  /* ---------------- agenda mode (≤640px) ---------------- */

  if (narrow) {
    const wIdx = weekdayIndex(agendaDay.jy, agendaDay.jm, agendaDay.jd)
    const isToday = sameDayObj(agendaDay, today)
    const step = (dir) => {
      const nd = addDaysJalali(agendaDay, dir)
      if (weekdayIndex(nd.jy, nd.jm, nd.jd) < weekdayIndex(agendaDay.jy, agendaDay.jm, agendaDay.jd)) {
        setWeekStart(addDaysJalali(nd, -weekdayIndex(nd.jy, nd.jm, nd.jd)))
      }
      setAgendaDay(nd)
      onSelectDay && onSelectDay(nd)
    }
    const startXTouch = (e) => {
      if (e.target.closest('.wt-block') || e.target.closest('.wtb-grip')) return
      swipeRef.current = { x: e.clientX, y: e.clientY }
    }
    const endXTouch = (e) => {
      const st = swipeRef.current
      swipeRef.current = null
      if (!st) return
      const dx = e.clientX - st.x
      const dy = e.clientY - st.y
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        // swipe right → روز قبل، swipe left → روز بعد
        step(dx > 0 ? -1 : 1)
      }
    }
    const d = agendaDay
    return (
      <div className={`wt wt-agenda ${dragging ? 'drag-active' : ''}`} dir="rtl">
        <div className="wta-controls">
          <button className="wta-nav" aria-label="روز بعد" onClick={() => step(1)}>‹</button>
          <div className="wta-titlewrap">
            <span className="wta-title">{`${WEEKDAY_FULL[wIdx]} ${toPersianDigits(d.jd)}`}</span>
            <span className="wta-month">{MONTH_NAMES[d.jm - 1]} {toPersianDigits(d.jy)}</span>
          </div>
          <button className="wta-nav" aria-label="روز قبل" onClick={() => step(-1)}>›</button>
        </div>

        <div className="wta-grid">
          <div className="wt-axis">
            <span className="wt-axis-head" />
            {hours.map((h) => (
              <span key={h} className="wt-hour">{toPersianDigits(h)}:۰۰</span>
            ))}
          </div>
          <div
            className="wta-daycol"
            onPointerDown={startXTouch}
            onPointerUp={endXTouch}
          >
            {renderCol(d, 0, isToday)}
          </div>
        </div>

        {!isToday && (
          <button className="wta-today-chip" onClick={goToday}>امروز</button>
        )}
      </div>
    )
  }

  /* ---------------- 7-day grid (desktop/tablet) ---------------- */

  return (
    <div className={`wt ${dragging ? 'drag-active' : ''}`} dir="rtl">
      <div className="wt-controls">
        <span className="wt-title">{weekTitle}</span>
        <div className="wt-switch">
          <button onClick={() => setWeekStart(addDaysJalali(weekStart, -7))}>هفته قبل</button>
          <button className="wt-today" onClick={goToday}>امروز</button>
          <button onClick={() => setWeekStart(addDaysJalali(weekStart, 7))}>هفته بعد</button>
        </div>
      </div>

      <div className="wt-grid">
        <div className="wt-axis">
          <span className="wt-axis-head" />
          {hours.map((h) => (
            <span key={h} className="wt-hour">
              {toPersianDigits(h)}:۰۰
            </span>
          ))}
        </div>

        <div className="wt-days">
          {days.map((d, dayIdx) => {
            const wIdx = weekdayIndex(d.jy, d.jm, d.jd)
            const isToday = sameDayObj(d, today)
            return (
              <div className="wt-day-wrap" key={dayKey(d.jy, d.jm, d.jd)}>
                <button
                  className={`wt-day ${wIdx === 6 ? 'holiday' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => onSelectDay && onSelectDay(d)}
                  title="نمایش جزئیات این روز"
                >
                  <span className="wtd-name">{WEEKDAY_FULL[wIdx]}</span>
                  <span className="wtd-num">{toPersianDigits(d.jd)}</span>
                </button>
                {renderCol(d, dayIdx, isToday)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}