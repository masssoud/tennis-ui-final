import { toGregorian, toJalaali } from './persianDate'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api/v1'
const TOKEN_KEY = 'tennis-yar-token'

export const TENNIS_SPORT_ID = '00000000-0000-0000-0000-000000000011'

const FACILITY_IDS = {
  'زمین خاکی': '00000000-0000-0000-0000-000000000021',
  'زمین آبی': '00000000-0000-0000-0000-000000000022',
  'زمین چمن': '00000000-0000-0000-0000-000000000023',
}

const SESSION_TYPE_IDS = {
  private: '00000000-0000-0000-0000-000000000041',
  group: '00000000-0000-0000-0000-000000000042',
  spar: '00000000-0000-0000-0000-000000000043',
  technique: '00000000-0000-0000-0000-000000000044',
}

const TYPE_BY_ID = Object.fromEntries(Object.entries(SESSION_TYPE_IDS).map(([key, id]) => [id, key]))

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok || body?.resultCode !== '00') {
    throw new Error(body?.resultMessage || `Request failed (${response.status})`)
  }
  return body.data
}

function isoFromJalali(session) {
  const { gy, gm, gd } = toGregorian(session.jy, session.jm, session.jd)
  const date = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
  const time = `${String(session.hour).padStart(2, '0')}:${String(session.minute).padStart(2, '0')}:00`
  return `${date}T${time}`
}

function minutesBetween(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 60000)
}

function localIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`
}

function fromApiSession(session, facilities) {
  const start = new Date(session.startsAt)
  const jalali = toJalaali(start.getFullYear(), start.getMonth() + 1, start.getDate())
  const facility = facilities.find((item) => item.id === session.facilityId)
  return {
    id: session.id,
    studentId: session.participantIds[0],
    jy: jalali.jy,
    jm: jalali.jm,
    jd: jalali.jd,
    hour: start.getHours(),
    minute: start.getMinutes(),
    duration: minutesBetween(session.startsAt, session.endsAt),
    type: TYPE_BY_ID[session.sessionTypeId] || 'private',
    court: facility?.name || 'زمین خاکی',
    note: session.notes || '',
  }
}

export async function requestOtp(phone) {
  return request('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  })
}

export async function verifyOtp(phone, code, name) {
  const data = await request('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code, ...(name ? { name } : {}) }),
  })
  localStorage.setItem(TOKEN_KEY, data.accessToken)
  return {
    ...data.user,
    role: data.user.role.toLowerCase(),
  }
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' })
  } finally {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export async function currentUser() {
  const data = await request('/auth/me')
  return { ...data, role: data.role.toLowerCase() }
}

export async function loadState(user) {
  const students = await request('/students')
  const facilities = await request(`/catalog/facilities?sportId=${TENNIS_SPORT_ID}`)
  const page = await request('/sessions?size=100')
  const users = students.map((student) => ({ ...student, role: 'student' }))
  if (user.role === 'coach') users.unshift(user)
  return {
    users,
    facilities,
    sessions: page.items.map((session) => fromApiSession(session, facilities)),
  }
}

export async function createSessions(sessions, facilities) {
  const created = []
  for (const session of sessions) {
    const facilityId = FACILITY_IDS[session.court] || facilities.find((item) => item.name === session.court)?.id
    const sessionTypeId = SESSION_TYPE_IDS[session.type]
    if (!facilityId || !sessionTypeId) throw new Error('نوع جلسه یا زمین معتبر نیست')
    const startsAt = isoFromJalali(session)
    const end = new Date(startsAt)
    end.setMinutes(end.getMinutes() + session.duration)
    const data = await request('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        sportId: TENNIS_SPORT_ID,
        facilityId,
        sessionTypeId,
        startsAt,
        endsAt: localIso(end),
        participantIds: [session.studentId],
        notes: session.note || '',
      }),
    })
    created.push(fromApiSession(data, facilities))
  }
  return created
}
