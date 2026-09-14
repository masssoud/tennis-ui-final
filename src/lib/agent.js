import {
  addDaysJalali,
  todayJalali,
  weekdayIndex,
  toPersianDigits,
  WEEKDAY_FULL,
} from './persianDate'
import { TYPE_META, timeToFa, JALALI_MONTH_NAMES, courtLabel } from './data'

export const TYPE_WORDS = {
  'انفرادی': 'private',
  'فردی': 'private',
  'گروهی': 'group',
  'مسابقه': 'spar',
  'اسپارینگ': 'spar',
  'تکنیک': 'technique',
}

const COURT_WORDS = {
  'خاکی': 'زمین خاکی',
  'خاک': 'زمین خاکی',
  'آبی': 'زمین آبی',
  'چمن': 'زمین چمن',
  'چمنی': 'زمین چمن',
}

const WEEK = {
  'شنبه': 0,
  'یکشنبه': 1,
  'دوشنبه': 2,
  'سه شنبه': 3,
  'سهشنبه': 3,
  'چهارشنبه': 4,
  'پنجشنبه': 5,
  'پنج شنبه': 5,
  'جمعه': 6,
}

const NUM_WORDS = {
  'یک': 1, 'دو': 2, 'سه': 3, 'چهار': 4, 'پنج': 5,
  'شش': 6, 'شیش': 6, 'هفت': 7, 'هشت': 8, 'نه': 9, 'نُه': 9,
  'ده': 10, 'یازده': 11, 'دوازده': 12,
}

function strip(text) {
  return String(text || '')
    .replace(/\u200c/g, ' ')
    .replace(/[ى]/g, 'ی')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim()
}

export function sessionLabel(s, users) {
  const u = users.find((x) => x.id === s.studentId)
  const tone = TYPE_META[s.type]
  return `${u?.name || '؟'} · ${toPersianDigits(s.jd)} ${JALALI_MONTH_NAMES[s.jm - 1]} · ${timeToFa(s.hour, s.minute)} · ${courtLabel(s.court)}${tone ? ' · ' + tone.label : ''}`
}

function findStudent(parsed, users) {
  for (const u of users) {
    const tokens = u.name.trim().split(/\s+/)
    if (tokens.some((tok) => tok.length > 1 && parsed.text.includes(tok))) return u
  }
  return null
}

function findDay(parsed, today) {
  if (/\bامروز\b/.test(parsed.text)) return { day: { ...today }, dow: null, label: 'امروز' }
  if (/\bفردا\b/.test(parsed.text)) return {
    day: addDaysJalali(today, 1),
    dow: null,
    label: 'فردا',
  }
  for (const [w, dow] of Object.entries(WEEK)) {
    if (parsed.text.includes(w)) {
      const from = /از /.test(parsed.text) ? addDaysJalali(today, 1) : today
      let d = from
      for (let i = 0; i < 8; i++) {
        if (weekdayIndex(d.jy, d.jm, d.jd) === dow) break
        d = addDaysJalali(d, 1)
      }
      return { day: d, dow: parsed.text.includes('هر ' + w) ? dow : null, label: w }
    }
  }
  return { day: { ...today }, dow: null, label: null }
}

function findTime(parsed) {
  const coloned = parsed.text.match(/(\d{1,2})[:,٫.](\d{1,2})/)
  if (coloned) {
    const h = Number(coloned[1])
    const m = Number(coloned[2])
    if (h >= 7 && h <= 21 && m % 30 === 0) return { hour: h, minute: m }
  }
  const withHalf = /(\d{1,2})\s*و نیم/.exec(parsed.text)
  if (withHalf) {
    const h = Number(withHalf[1])
    if (h >= 7 && h < 21) return { hour: h, minute: 30 }
  }
  const sa = /ساعت\s*(\d{1,2})/.exec(parsed.text)
  if (sa) {
    const h = Number(sa[1])
    if (h >= 7 && h <= 21) return { hour: h, minute: 0 }
  }
  return null
}

function findCount(parsed) {
  const digits = /(\d{1,3})\s*جلسه/.exec(parsed.text)
  if (digits) return Math.min(Number(digits[1]), 24)
  const tokens = parsed.text.split(' ')
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i].startsWith('جلسه') && NUM_WORDS[tokens[i - 1]]) {
      return Math.min(NUM_WORDS[tokens[i - 1]], 24)
    }
  }
  return null
}

function findType(parsed) {
  for (const [w, k] of Object.entries(TYPE_WORDS)) {
    if (parsed.text.includes(w)) return k
  }
  return 'private'
}

function findCourt(parsed) {
  for (const [w, label] of Object.entries(COURT_WORDS)) {
    if (parsed.text.includes(w)) return label
  }
  return 'زمین خاکی'
}

function slugIntent(text) {
  if (/(حذف کن|لغو کن|پاک کن)/.test(text)) return 'delete'
  if (/(چی داریم|چی دارم|جلسه های امروز|بگو امروز)/.test(text)) return 'today'
  if (/(چند جلسه در پیش|چند جلسه داره|چند جلسه داره)/.test(text)) return 'remaining'
  if (/(پیشنهاد|بهترین چیدمان)/.test(text)) return 'propose'
  if (/(بچین|بساز|ثبت کن|تعریف کن|بریز|اضافه کن)/.test(text)) return 'create'
  return 'help'
}

function proposePlan({ today, users, sessions }) {
  const pools = {
    hours: [9, 16, 17, 10, 18, 8],
    courts: ['زمین خاکی', 'زمین آبی', 'زمین چمن'],
  }
  const list = []
  users.slice(0, 4).forEach((u, ui) => {
    const existDays = new Set(
      sessions.filter((s) => s.studentId === u.id).map((s) => `${s.jy}-${s.jm}-${s.jd}`),
    )
    let added = 0
    for (let i = 1; i <= 7 && added < 2; i++) {
      const d = addDaysJalali(today, i)
      const k = `${d.jy}-${d.jm}-${d.jd}`
      if (existDays.has(k)) continue
      const hour = pools.hours[(i + ui) % pools.hours.length]
      const court = pools.courts[(i + ui) % pools.courts.length]
      const clash = sessions.some(
        (s) => `${s.jy}-${s.jm}-${s.jd}` === k && s.hour === hour && s.court === court,
      )
      if (clash) continue
      list.push({
        studentId: u.id,
        jy: d.jy,
        jm: d.jm,
        jd: d.jd,
        hour,
        minute: 0,
        duration: 60,
        type: 'private',
        court,
        note: '',
      })
      added += 1
    }
  })
  const lines = list.map(
    (s) =>
      `• ${WEEKDAY_FULL[weekdayIndex(s.jy, s.jm, s.jd)]} ${toPersianDigits(s.jd)} — ${timeToFa(s.hour, s.minute)} — ${users.find((x) => x.id === s.studentId)?.name || '؟'}`,
  )
  return {
    reply: `پیشنهاد چیدمان — ${toPersianDigits(list.length)} جلسه:\n${lines.join('\n')}`,
    kind: 'preview',
    preview: list,
    desc: 'پیشنهاد خودکار با چشم‌پوشی از تداخل زمین',
  }
}

function todayReport(today, sessions, users) {
  const tKey = `${today.jy}-${today.jm}-${today.jd}`
  const list = sessions
    .filter((s) => `${s.jy}-${s.jm}-${s.jd}` === tKey)
    .sort((a, b) => a.hour - b.hour)
  if (list.length === 0) {
    return { reply: 'امروز جلسه‌ای نداری — وقت خوبی برای چیدن یک برنامه‌ی تازه.' }
  }
  const lines = list.map(
    (s) =>
      `• ${timeToFa(s.hour, s.minute)} — ${(users.find((u) => u.id === s.studentId) || {}).name || '؟'} · ${courtLabel(s.court)}`,
  )
  return {
    reply: `امروز ${toPersianDigits(list.length)} جلسه داری:\n${lines.join('\n')}`,
  }
}

export function faSessionDate(d) {
  return `${toPersianDigits(d.jd)} ${JALALI_MONTH_NAMES[d.jm - 1]}`
}

export default function runAgent(rawText, { users, sessions }) {
  const today = todayJalali()
  const parsed = {
    text: strip(rawText),
    today,
    users,
    sessions: sessions || [],
  }

  const intent = slugIntent(parsed.text)
  const student = findStudent(parsed, users)

  if (intent === 'delete') {
    if (!student) {
      return { reply: 'برای حذف، اسم هنرجو را بگو — مثلاً «جلسه‌های مسعود را حذف کن».' }
    }
    const targets = sessions.filter((s) => s.studentId === student.id)
    if (targets.length === 0) {
      return { reply: `جلسه‌ای از ${student.name} پیدا نکردم.` }
    }
    return {
      reply: `${toPersianDigits(targets.length)} جلسه‌ی ${student.name} پیدا شد — کدام حذف شود؟`,
      kind: 'sessions',
      data: targets,
    }
  }

  if (intent === 'today') return todayReport(today, sessions, users)

  if (intent === 'remaining') {
    if (!student) {
      const lines = users.map((u) => {
        const n = parsed.sessions.filter((s) => s.studentId === u.id).length
        return `• ${u.name}: ${toPersianDigits(n)} جلسه در پیش`
      })
      return { reply: lines.join('\n') }
    }
    const n = parsed.sessions.filter((s) => s.studentId === student.id).length
    return { reply: `${student.name} ${toPersianDigits(n)} جلسه در پیش دارد.` }
  }

  if (intent === 'propose') return proposePlan(parsed)

  if (intent === 'create') {
    const dayInfo = findDay(parsed, today)
    const time = findTime(parsed)
    if (!student) {
      return {
        reply: 'کدام هنرجو؟ اسمش را بگو — مثلاً «مسعود».',
        kind: 'chips',
        chips: users.map((u) => u.name),
      }
    }
    if (!time) {
      return { reply: 'ساعت را بگو — مثلاً «ساعت ۱۰» یا «۱۰:۳۰».' }
    }
    const dow = dayInfo.dow
    const count = findCount(parsed)
    if (count && dow === null) {
      return { reply: 'برای تکرار باید روز هفته بگو — مثلاً «هر شنبه».' }
    }
    const type = findType(parsed)
    const court = findCourt(parsed)
    const effectiveCount =
      count ?? (dow !== null ? 4 : 1)
    let list = []
    if (dow !== null) {
      const aligned = firstAligned(dayInfo.day, dow)
      for (let i = 0; i < effectiveCount; i++) {
        const d = addDaysJalali(aligned, i * 7)
        list.push({
          studentId: student.id, jy: d.jy, jm: d.jm, jd: d.jd,
          hour: time.hour, minute: time.minute, duration: 60, type, court, note: '',
        })
      }
    } else {
      list = [{
        studentId: student.id, jy: dayInfo.day.jy, jm: dayInfo.day.jm, jd: dayInfo.day.jd,
        hour: time.hour, minute: time.minute, duration: 60, type, court, note: '',
      }]
    }
    const desc =
      `${student.name} · ${TYPE_META[type].label} · ${court} · شروع ${faSessionDate(dayInfo.day)}`
    return {
      reply: `پیش‌نمایش ${toPersianDigits(list.length)} جلسه آماده است:`,
      kind: 'preview',
      preview: list,
      desc,
    }
  }

  return {
    reply:
      'این‌ها را می‌فهمم:\n' +
      '• «هر شنبه ساعت ۱۰ برای مسعود ۱۰ جلسه انفرادی زمین خاکی بچین»\n' +
      '• «فردا ساعت ۱۶ گروهی برای سارا بچین»\n' +
      '• «امروز چی داریم؟»\n' +
      '• «مسعود چند جلسه در پیش داره؟»\n' +
      '• «جلسه‌های مسعود را حذف کن»',
  }
}

function firstAligned(from, dow) {
  let d = { ...from }
  for (let i = 0; i < 8; i++) {
    if (weekdayIndex(d.jy, d.jm, d.jd) === dow) return d
    d = addDaysJalali(d, 1)
  }
  return d
}