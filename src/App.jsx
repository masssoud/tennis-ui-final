import { useEffect, useState } from 'react'
import './App.css'
import LoginPage from './components/LoginPage'
import CoachDashboard from './components/CoachDashboard'
import StudentDashboard from './components/StudentDashboard'
import { todayJalali, jalaaliMonthLength } from './lib/persianDate'

const STORAGE_KEY = 'tennis-yar-v1'
const USER_KEY = 'tennis-yar-user'

const seedUsers = [
  { id: 'coach-1', name: 'علی سیدی', role: 'coach', phone: '09120000001', color: '#d97b46' },
  { id: 's-1', name: 'مسعود نجفی', role: 'student', phone: '09120000002', color: '#b3441f' },
  { id: 's-2', name: 'سارا احمدی', role: 'student', phone: '09120000003', color: '#1b72c8' },
  { id: 's-3', name: 'میلاد کریمی', role: 'student', phone: '09120000004', color: '#a24ccf' },
]

function makeSeedSessions() {
  const t = todayJalali()
  const items = []
  const base = [
    { s: 's-1', day: 0, hour: 8, type: 'private', court: 'زمین خاکی' },
    { s: 's-1', day: 2, hour: 10, type: 'private', court: 'زمین خاکی' },
    { s: 's-2', day: 0, hour: 9, type: 'group', court: 'زمین خاکی' },
    { s: 's-2', day: 4, hour: 16, type: 'group', court: 'زمین خاکی' },
    { s: 's-3', day: 1, hour: 18, type: 'spar', court: 'زمین خاکی' },
    { s: 's-3', day: 3, hour: 15, type: 'private', court: 'زمین خاکی' },
  ]
  base.forEach((b, i) => {
    let jd = t.jd + b.day
    let jm = t.jm
    let jy = t.jy
    const len = jalaaliMonthLength(jy, jm)
    if (jd > len) {
      jd -= len
      jm += 1
    }
    if (jm > 12) {
      jm = 1
      jy += 1
    }

    items.push({
      id: `seed-${i}`,
      studentId: b.s,
      jy,
      jm,
      jd,
      hour: b.hour,
      minute: 0,
      duration: 60,
      type: b.type,
      court: b.court,
      note: '',
    })
  })
  return items
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {
    users: seedUsers,
    sessions: makeSeedSessions(),
  }
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  useEffect(() => {
    try {
      if (currentUser) localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
      else localStorage.removeItem(USER_KEY)
    } catch {
      /* ignore */
    }
  }, [currentUser])

  const update = (patch) => setState((prev) => ({ ...prev, ...patch }))

  const addUser = (user) => {
    const id = `student-${Date.now()}`
    const complete = { ...user, id, color: '#b3441f' }
    update({ users: [...state.users, complete] })
    return complete
  }

  const addSessions = (list) => {
    update({
      sessions: [
        ...state.sessions,
        ...list.map((s) => ({
          id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...s,
        })),
      ],
    })
  }

  const updateSession = (id, patch) => {
    update({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  const removeSession = (id) => {
    update({ sessions: state.sessions.filter((s) => s.id !== id) })
  }

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY)
    setState({
      users: seedUsers,
      sessions: makeSeedSessions(),
    })
  }

  const handleLogin = (user) => {
    if (!state.users.some((u) => u.id === user.id)) {
      update({ users: [...state.users, user] })
    }
    setCurrentUser(user)
  }

  if (!currentUser) {
    return (
      <LoginPage
        users={state.users}
        onLogin={handleLogin}
      />
    )
  }

  if (currentUser.role === 'coach') {
    return (
      <CoachDashboard
        users={state.users.filter((u) => u.role === 'student')}
        sessions={state.sessions}
        currentUser={currentUser}
        onAddUser={addUser}
        onAddSessions={addSessions}
        onUpdateSession={updateSession}
        onRemoveSession={removeSession}
        onLogout={() => setCurrentUser(null)}
        onResetDemo={resetDemo}
      />
    )
  }

  return (
    <StudentDashboard
      currentUser={currentUser}
      sessions={state.sessions.filter((s) => s.studentId === currentUser.id)}
      onLogout={() => setCurrentUser(null)}
    />
  )
}