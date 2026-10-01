import { useEffect, useState } from 'react'
import './App.css'
import LoginPage from './components/LoginPage'
import CoachDashboard from './components/CoachDashboard'
import StudentDashboard from './components/StudentDashboard'
import { createSessions, loadState, requestOtp, verifyOtp, logout } from './lib/api'

const USER_KEY = 'tennis-yar-user'

const seedUsers = [
  { id: 'coach-1', name: 'علی سیدی', role: 'coach', phone: '09120000001', color: '#d97b46' },
  { id: 's-1', name: 'مسعود نجفی', role: 'student', phone: '09120000002', color: '#b3441f' },
  { id: 's-2', name: 'سارا احمدی', role: 'student', phone: '09120000003', color: '#1b72c8' },
  { id: 's-3', name: 'میلاد کریمی', role: 'student', phone: '09120000004', color: '#a24ccf' },
]

export default function App() {
  const [state, setState] = useState({ users: seedUsers, sessions: [], facilities: [] })
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
      if (currentUser) localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
      else localStorage.removeItem(USER_KEY)
    } catch {
      /* ignore */
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    loadState(currentUser)
      .then((remoteState) => {
        if (!cancelled) setState(remoteState)
      })
      .catch((error) => {
        console.error('Could not load API state:', error)
        if (!cancelled) setCurrentUser(null)
      })
    return () => { cancelled = true }
  }, [currentUser])

  const update = (patch) => setState((prev) => ({ ...prev, ...patch }))

  const addUser = (user) => {
    const complete = { ...user, id: `student-${Date.now()}`, color: '#b3441f' }
    update({ users: [...state.users, complete] })
    return complete
  }

  const addSessions = async (list) => {
    const created = await createSessions(list, state.facilities)
    update({ sessions: [...state.sessions, ...created] })
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
    setState((previous) => ({ ...previous, sessions: [] }))
  }

  const handleRequestOtp = (phone) => requestOtp(phone)

  const handleVerifyOtp = async (phone, code, name) => {
    const loggedInUser = await verifyOtp(phone, code, name)
    setCurrentUser(loggedInUser)
  }

  const handleLogout = async () => {
    await logout()
    setCurrentUser(null)
  }

  if (!currentUser) {
    return (
      <LoginPage
        users={state.users}
        onRequestOtp={handleRequestOtp}
        onVerifyOtp={handleVerifyOtp}
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
         onLogout={handleLogout}
        onResetDemo={resetDemo}
      />
    )
  }

  return (
    <StudentDashboard
      currentUser={currentUser}
      sessions={state.sessions.filter((s) => s.studentId === currentUser.id)}
        onLogout={handleLogout}
    />
  )
}
