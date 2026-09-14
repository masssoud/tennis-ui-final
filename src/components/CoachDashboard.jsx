import { useMemo, useRef, useState } from 'react'
import PersianCalendar from './PersianCalendar'
import WeekTimeline from './WeekTimeline'
import SessionModal from './SessionModal'
import AgentDrawer from './AgentDrawer'
import { TYPE_META, timeToFa, courtLabel } from '../lib/data'
import { LogoutIcon, PlusIcon, TrashIcon, ClockIcon, Avatar } from './icons'
import { formatFull, dayKey, toPersianDigits, todayJalali } from '../lib/persianDate'

function AddStudentForm({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onAdd({ name: name.trim(), role: 'student' })
      onCancel()
    }
  }
  return (
    <form className="add-student" onSubmit={submit}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="نام هنرجوی جدید"
      />
      <button type="submit" aria-label="افزودن"><PlusIcon /></button>
    </form>
  )
}

export default function CoachDashboard({
  users,
  sessions,
  currentUser,
  onAddUser,
  onAddSessions,
  onUpdateSession,
  onRemoveSession,
  onLogout,
  onResetDemo,
}) {
  const today = todayJalali()
  const [selectedDate, setSelectedDate] = useState({ ...today })
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [view, setView] = useState('week')
  const [slotHour, setSlotHour] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = (msg, actionLabel, onAction) => {
    clearTimeout(toastTimer.current)
    setToast({ msg, actionLabel, onAction })
    toastTimer.current = setTimeout(() => setToast(null), 6000)
  }

  const handleDelete = (s) => {
    onRemoveSession(s.id)
    showToast('جلسه حذف شد', 'بازگردانی', () => {
      onAddSessions([s])
      setToast(null)
    })
  }

  const visibleSessions = useMemo(
    () =>
      selectedStudent
        ? sessions.filter((s) => s.studentId === selectedStudent)
        : sessions,
    [sessions, selectedStudent],
  )

  const daySessions = useMemo(
    () =>
      visibleSessions
        .filter((s) => dayKey(s.jy, s.jm, s.jd) === dayKey(selectedDate.jy, selectedDate.jm, selectedDate.jd))
        .sort((a, b) => a.hour - b.hour),
    [visibleSessions, selectedDate],
  )

  const marks = useMemo(
    () =>
      visibleSessions.map((s) => {
        const meta = TYPE_META[s.type]
        return { jy: s.jy, jm: s.jm, jd: s.jd, tone: meta ? meta.tone : 'default' }
      }),
    [visibleSessions],
  )

  const openCreate = (date, hour = null) => {
    setSlotHour(hour)
    if (users.length === 0) setShowAddStudent(true)
    else {
      setSelectedDate({ ...date })
      setAdding(true)
    }
  }

  return (
    <div className="dash dash-coach" dir="rtl">
      <header className="dash-top">
        <div className="dash-brand">
          <span className="brand-dot" /> تنیس‌یار
          <span className="brand-role">مربی</span>
        </div>
        <span className="dash-today">{formatFull(today.jy, today.jm, today.jd)}</span>
        <div className="dash-user">
          <Avatar name={currentUser.name} color={currentUser.color} />
          <span className="dash-user-name">{currentUser.name}</span>
          <button className="icon-btn" onClick={onLogout} title="خروج"><LogoutIcon /></button>
        </div>
      </header>

      <div className="coach-layout">
        <aside className="sidebar">
          <div className="side-head">
            <h3>هنرجوها</h3>
            <button
              className="icon-btn round"
              onClick={() => setShowAddStudent((v) => !v)}
              title="افزودن هنرجو"
            >
              <PlusIcon />
            </button>
          </div>

          {showAddStudent && (
            <AddStudentForm onAdd={onAddUser} onCancel={() => setShowAddStudent(false)} />
          )}

          <div className="student-list">
            <button
              className={`student-item ${!selectedStudent ? 'active' : ''}`}
              onClick={() => setSelectedStudent(null)}
            >
              <span className="student-meta">
                <span className="student-name all">همه هنرجوها</span>
                <span className="student-sub">{toPersianDigits(sessions.length)} جلسه در پیش</span>
              </span>
            </button>
            {users.map((u) => (
              <button
                key={u.id}
                className={`student-item ${selectedStudent === u.id ? 'active' : ''}`}
                onClick={() => setSelectedStudent(u.id)}
              >
                <Avatar name={u.name} color={u.color} />
                <span className="student-meta">
                  <span className="student-name">{u.name}</span>
                  <span className="student-sub">
                    {toPersianDigits(sessions.filter((s) => s.studentId === u.id).length)} جلسه
                  </span>
                </span>
              </button>
            ))}
            {users.length === 0 && (
              <p className="side-empty">هنوز هنرجویی اضافه نشده است.</p>
            )}
          </div>

          <div className="side-stats">
            <div className="stat">
              <span className="stat-num">{toPersianDigits(users.length)}</span>
              <span className="stat-label">هنرجو</span>
            </div>
            <div className="stat">
              <span className="stat-num">{toPersianDigits(sessions.length)}</span>
              <span className="stat-label">جلسه</span>
            </div>
          </div>

          <div className="side-foot">
            {showReset ? (
              <>
                <p>داده‌های نمونه بازیابی شود؟</p>
                <div>
                  <button className="btn-danger-sm" onClick={() => { onResetDemo(); setShowReset(false) }}>
                    تایید
                  </button>
                  <button className="btn-ghost" onClick={() => setShowReset(false)}>انصراف</button>
                </div>
              </>
            ) : (
              <button className="side-reset" onClick={() => setShowReset(true)}>
                بازنشانی داده‌های نمونه
              </button>
            )}
          </div>
        </aside>

        <main className="main">
          <section className="panel cal-panel">
            <div className="panel-head">
              <h2>تقویم تمرین{selectedStudent ? ' — ' + users.find((u) => u.id === selectedStudent)?.name : ''}</h2>
              <div className="view-switch" role="tablist" aria-label="نمای تقویم">
                <button
                  className={`view-btn ${view === 'month' ? 'active' : ''}`}
                  onClick={() => setView('month')}
                >
                  ماه
                </button>
                <button
                  className={`view-btn ${view === 'week' ? 'active' : ''}`}
                  onClick={() => setView('week')}
                >
                  هفته
                </button>
              </div>
            </div>

            {view === 'month' ? (
              <PersianCalendar
                selected={selectedDate}
                onSelect={(d) => setSelectedDate({ ...d })}
                marks={marks}
              />
            ) : (
              <WeekTimeline
                sessions={visibleSessions}
                allSessions={sessions}
                users={users}
                onEdit={(s) => setEditing(s)}
                onCreate={openCreate}
                onSelectDay={(d) => setSelectedDate({ ...d })}
                onDropUpdate={(id, patch, kind) => {
                  onUpdateSession(id, patch)
                  showToast(
                    kind === 'resize'
                      ? 'مدت جلسه به‌روزرسانی شد ✓'
                      : 'جلسه جابه‌جا شد ✓',
                  )
                }}
                onDragConflict={(reason) =>
                  showToast(
                    reason === 'range'
                      ? 'خارج از بازه مجاز است — جابه‌جایی انجام نشد'
                      : 'تداخل زمانی — این جا خالی نیست',
                  )
                }
              />
            )}
          </section>

          <section className="panel day-panel">
            <div className="panel-head between">
              <h3>{formatFull(selectedDate.jy, selectedDate.jm, selectedDate.jd)}</h3>
              <button
                className="btn-primary sm"
                onClick={() => (users.length ? setAdding(true) : setShowAddStudent(true))}
              >
                <PlusIcon /> جلسه جدید
              </button>
            </div>

            {daySessions.length === 0 ? (
              <div className="empty-day">
                <span className="empty-emoji">🎾</span>
                <p>
                  {users.length
                    ? 'این روز خالی است — بهترین وقت برای چیدن جلسه.'
                    : 'اول یک هنرجو اضافه کن، بعد زمان‌بندی شروع می‌شود.'}
                </p>
                {users.length > 0 && (
                  <button className="empty-cta" onClick={() => setAdding(true)}>
                    <PlusIcon /> تنظیم اولین جلسه این روز
                  </button>
                )}
                {users.length === 0 && (
                  <button className="empty-cta" onClick={() => setShowAddStudent(true)}>
                    <PlusIcon /> افزودن هنرجو
                  </button>
                )}
              </div>
            ) : (
              <div className="day-sessions">
                {daySessions.map((s, i) => {
                  const meta = TYPE_META[s.type]
                  const u = users.find((x) => x.id === s.studentId)
                  return (
                    <div
                      key={s.id}
                      className="session-card anim-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                      onClick={() => setEditing(s)}
                      title="برای ویرایش کلیک کنید"
                    >
                      <span className={`session-rail rail-${meta.tone}`} />
                      <Avatar name={u?.name || '؟'} color={u?.color} />
                      <div className="session-info">
                        <div className="session-title">
                          <span>{u?.name || '؟'}</span>
                          <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
                          {dayKey(s.jy, s.jm, s.jd) === dayKey(today.jy, today.jm, today.jd) &&
                            s.hour * 60 + s.minute <= todayJsMin() &&
                            todayJsMin() < s.hour * 60 + s.minute + s.duration && (
                            <span className="badge badge-live">در جریان</span>
                          )}
                        </div>
                        <div className="session-sub">
                          <ClockIcon /> {timeToFa(s.hour, s.minute)}
                          <span>·</span>
                          <span>{toPersianDigits(s.duration)} دقیقه</span>
                          <span>·</span>
                          <span>{courtLabel(s.court)}</span>
                        </div>
                      </div>
                      <button
                        className="icon-btn danger"
                        onClick={(e) => { e.stopPropagation(); handleDelete(s) }}
                        title="حذف"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {(adding || editing) && (
        <SessionModal
          date={selectedDate}
          defaultStudentId={selectedStudent}
          initialHour={slotHour}
          students={users}
          allSessions={sessions}
          editing={editing}
          onSave={(list) => {
            if (editing) {
              onUpdateSession(editing.id, list[0])
              showToast('به‌روزرسانی شد ✓')
            } else {
              onAddSessions(list)
              showToast(
                list.length > 1
                  ? `${toPersianDigits(list.length)} جلسه ثبت شد ✓`
                  : 'جلسه ثبت شد ✓',
              )
            }
            setEditing(null)
            setAdding(false)
            setSlotHour(null)
          }}
          onClose={() => { setEditing(null); setAdding(false); setSlotHour(null) }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.msg}</span>
          {toast.actionLabel && (
            <button onClick={toast.onAction}>{toast.actionLabel}</button>
          )}
        </div>
      )}

      <AgentDrawer
        users={users}
        sessions={sessions}
        onAddSessions={onAddSessions}
        onRemoveSession={onRemoveSession}
      />
    </div>
  )
}

function todayJsMin() {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}