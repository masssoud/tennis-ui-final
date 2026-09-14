import { useMemo, useState } from 'react'
import PersianCalendar from './PersianCalendar'
import { TYPE_META, timeToFa, courtLabel } from '../lib/data'
import { LogoutIcon, ClockIcon, Avatar } from './icons'
import {
  formatFull,
  dayKey,
  toPersianDigits,
  todayJalali,
  weekdayIndex,
  WEEKDAY_FULL,
  addDaysJalali,
} from '../lib/persianDate'

export default function StudentDashboard({ currentUser, sessions, onLogout }) {
  const today = todayJalali()
  const [selectedDate, setSelectedDate] = useState({ ...today })
  const [weekOffset, setWeekOffset] = useState(0)

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()

  const upcoming = useMemo(
    () =>
      sessions
        .filter(
          (s) =>
            (s.jy > today.jy ||
              (s.jy === today.jy && s.jm > today.jm) ||
              (s.jy === today.jy && s.jm === today.jm && s.jd >= today.jd)) &&
            !(s.jd === today.jd && s.hour * 60 + s.minute < nowMin),
        )
        .sort((a, b) => a.jy - b.jy || a.jm - b.jm || a.jd - b.jd || a.hour - b.hour)
        .slice(0, 6),
    [sessions, today, nowMin],
  )

  const next = upcoming[0]
  const nextRel = useMemo(() => {
    if (!next) return null
    if (next.jy === today.jy && next.jm === today.jm && next.jd === today.jd) {
      const mins = next.hour * 60 + next.minute - nowMin
      if (mins <= 60) return `${toPersianDigits(Math.max(mins, 0))} دقیقه دیگر`
      return `${toPersianDigits(Math.floor(mins / 60))} ساعت و ${toPersianDigits(mins % 60)} دیگر`
    }
    const tm = addDaysJalali(today, 1)
    if (next.jy === tm.jy && next.jm === tm.jm && next.jd === tm.jd) return 'فردا'
    return WEEKDAY_FULL[weekdayIndex(next.jy, next.jm, next.jd)]
  }, [next, today, nowMin])

  const daySessions = useMemo(
    () =>
      sessions
        .filter((s) => dayKey(s.jy, s.jm, s.jd) === dayKey(selectedDate.jy, selectedDate.jm, selectedDate.jd))
        .sort((a, b) => a.hour - b.hour),
    [sessions, selectedDate],
  )

  const marks = useMemo(
    () =>
      sessions.map((s) => {
        const meta = TYPE_META[s.type]
        return { jy: s.jy, jm: s.jm, jd: s.jd, tone: meta ? meta.tone : 'default' }
      }),
    [sessions],
  )

  const totals = useMemo(() => {
    let count = 0
    let minutes = 0
    let byType = {}
    sessions.forEach((s) => {
      count += 1
      minutes += s.duration
      byType[s.type] = (byType[s.type] || 0) + 1
    })
    return { count, minutes, byType }
  }, [sessions])

  const weekDays = useMemo(() => {
    const start = today.jd + weekOffset * 7
    const days = []
    for (let i = 0; i < 7; i++) {
      let jd = start + i
      let jm = today.jm
      let jy = today.jy
      const len = jm <= 6 ? 31 : 30
      if (jd > len) { jd -= len; jm += 1 }
      if (jm > 12) { jm = 1; jy += 1 }
      if (jd < 1) { jm -= 1; if (jm < 1) { jm = 12; jy -= 1 } jd += jm <= 6 ? 31 : 30 }
      const key = dayKey(jy, jm, jd)
      days.push({
        jy, jm, jd, key,
        count: sessions.filter((s) => dayKey(s.jy, s.jm, s.jd) === key).length,
      })
    }
    return days
  }, [today, weekOffset, sessions])

  return (
    <div className="dash dash-student" dir="rtl">
      <header className="dash-top">
        <div className="dash-brand">
          <span className="brand-dot" /> تنیس‌یار
          <span className="brand-role">هنرجو</span>
        </div>
        <div className="dash-user">
          <Avatar name={currentUser.name} color={currentUser.color} />
          <span className="dash-user-name">{currentUser.name}</span>
          <button className="icon-btn" onClick={onLogout} title="خروج"><LogoutIcon /></button>
        </div>
      </header>

      <div className="student-hero">
        <div className="hero-text">
          <span className="hero-kicker">{formatFull(today.jy, today.jm, today.jd)}</span>
          <h1>سلام {currentUser.name} 👋</h1>
          {next ? (
            <div className="next-session">
              <span className="ns-dot" />
              <span>تمرین بعدی</span>
              <strong>{nextRel} — {timeToFa(next.hour, next.minute)}</strong>
              <span className="ns-sep">·</span>
              <span>{courtLabel(next.court)}</span>
            </div>
          ) : (
            <p>برنامه تمرینت هنوز خالی است — مربی‌ات به‌زودی وقت می‌چیند. آماده باش 🎾</p>
          )}
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hs-num">{toPersianDigits(totals.count)}</span>
            <span className="hs-label">جلسه</span>
          </div>
          <div className="hero-stat">
            <span className="hs-num">{toPersianDigits(Math.round(totals.minutes / 60))}</span>
            <span className="hs-label">ساعت تمرین</span>
          </div>
          <div className="hero-stat">
            <span className="hs-num">{toPersianDigits(Object.keys(totals.byType).length || 0)}</span>
            <span className="hs-label">نوع تمرین</span>
          </div>
        </div>
      </div>

      <div className="student-layout">
        <section className="panel cal-panel">
          <div className="panel-head">
            <h2>تقویم تمرین</h2>
          </div>
          <PersianCalendar
            selected={selectedDate}
            onSelect={(d) => setSelectedDate({ ...d })}
            marks={marks}
          />
          {daySessions.length > 0 && (
            <div className="day-mini">
              <p className="day-mini-head">{formatFull(selectedDate.jy, selectedDate.jm, selectedDate.jd)}</p>
              {daySessions.map((s) => {
                const meta = TYPE_META[s.type]
                return (
                  <div key={s.id} className="mini-card">
                    <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
                    <span>{timeToFa(s.hour, s.minute)}</span>
                    <span>·</span>
                    <span>{toPersianDigits(s.duration)} دقیقه</span>
                    <span>·</span>
                    <span>{courtLabel(s.court)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="panel upcoming-panel">
          <div className="panel-head">
            <h2>جلسات پیش‌رو</h2>
            <span className="count-pill">{toPersianDigits(upcoming.length)}</span>
          </div>

          {upcoming.length === 0 ? (
            <div className="empty-day">
              <span className="empty-emoji">🏸</span>
              <p>جلسه‌ای ثبت نشده است.</p>
            </div>
          ) : (
            <div className="upcoming-list">
              {upcoming.map((s, i) => {
                const meta = TYPE_META[s.type]
                const wd = WEEKDAY_FULL[weekdayIndex(s.jy, s.jm, s.jd)]
                return (
                  <div
                    key={s.id}
                    className="upcoming-card anim-up"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <div className="uc-date">
                      <span className="uc-d">{toPersianDigits(s.jd)}</span>
                      <span className="uc-m">{['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'][s.jm - 1]}</span>
                    </div>
                    <div className="uc-info">
                      <span className="uc-week">{wd}</span>
                      <span className="uc-time"><ClockIcon /> {timeToFa(s.hour, s.minute)}</span>
                      <span className="uc-court">{courtLabel(s.court)}</span>
                    </div>
                    <span className={`badge badge-${meta.tone} uc-type`}>{meta.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="week-view">
            <div className="week-switch">
              <button onClick={() => setWeekOffset((v) => v + 1)}>‹</button>
              <span>نمای هفته</span>
              <button onClick={() => setWeekOffset((v) => v - 1)}>›</button>
            </div>
            <div className="week-strip">
              {weekDays.map((d) => (
                <button
                  key={d.key}
                  className={`week-day ${d.count ? 'has-session' : ''} ${today.jd === d.jd && weekOffset === 0 && today.jm === d.jm ? 'now' : ''}`}
                  onClick={() => setSelectedDate({ jy: d.jy, jm: d.jm, jd: d.jd })}
                >
                  <span className="wd-week">{WEEKDAY_FULL[weekdayIndex(d.jy, d.jm, d.jd)]}</span>
                  <span className="wd-num">{toPersianDigits(d.jd)}</span>
                  <span className="wd-count">{d.count ? toPersianDigits(d.count) : ''}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}