export const WEEKDAY_NAMES = [
  'ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج',
]

export const WEEKDAY_FULL = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه',
]

export const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

export const MONTH_GENITIVE = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

const div = (a, b) => Math.trunc(a / b)
const mod = (a, b) => a - Math.trunc(a / b) * b

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
]

function jalCal(jy) {
  const bl = BREAKS.length
  const gy = jy + 621
  let leapJ = -14
  let jp = BREAKS[0]
  let jump = 0
  let i
  if (jy < jp || jy >= BREAKS[bl - 1]) {
    throw new Error(`Invalid Jalaali year ${jy}`)
  }
  for (i = 1; i < bl; i += 1) {
    const jm = BREAKS[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }
  let n = jy - jp
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  let march = 20 + leapJ - leapG
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4
  return { leap, gy, march }
}

export function isLeapJalaali(jy) {
  return jalCal(jy).leap === 0
}

export function jalaaliMonthLength(jy, jm) {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  if (isLeapJalaali(jy)) return 30
  return 29
}

export function toGregorian(jy, jm, jd) {
  const r = jalCal(jy)
  return d2g(g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1)
}

export function toJalaali(gy, gm, gd) {
  return d2j(g2d(gy, gm, gd))
}

function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return d
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}

function d2j(jdn) {
  const gy = d2g(jdn).gy
  let jy = gy - 621
  const r = jalCal(jy)
  const jdn1f = g2d(gy, 3, r.march)
  let jd, jm, k
  k = jdn - jdn1f
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31)
      jd = mod(k, 31) + 1
      return { jy, jm, jd }
    }
    k -= 186
  } else {
    jy -= 1
    k += 179
    if (r.leap === 1) k += 1
  }
  jm = 7 + div(k, 30)
  jd = mod(k, 30) + 1
  return { jy, jm, jd }
}

export function todayJalali() {
  const now = new Date()
  return toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function weekdayIndex(jy, jm, jd) {
  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  const date = new Date(gy, gm - 1, gd)
  return (date.getDay() + 1) % 7
}

export function monthGrid(jy, jm) {
  const start = weekdayIndex(jy, jm, 1)
  const length = jalaaliMonthLength(jy, jm)
  const cells = []
  for (let i = 0; i < start; i++) cells.push(null)
  for (let d = 1; d <= length; d++) cells.push({ jy, jm, jd: d })
  return cells
}

export function dayKey(jy, jm, jd) {
  return `${jy}-${jm}-${jd}`
}

export function formatFull(jy, jm, jd) {
  const weekday = WEEKDAY_FULL[weekdayIndex(jy, jm, jd)]
  return `${weekday} ${jd} ${MONTH_GENITIVE[jm - 1]} ${jy}`
}

export function addDaysJalali(date, n) {
  let { jy, jm, jd } = date
  let remaining = Math.abs(n)
  const step = n >= 0 ? 1 : -1
  while (remaining > 0) {
    jd += step
    if (jd > jalaaliMonthLength(jy, jm)) {
      jd = 1
      jm += 1
      if (jm > 12) {
        jm = 1
        jy += 1
      }
    } else if (jd < 1) {
      jm -= 1
      if (jm < 1) {
        jm = 12
        jy -= 1
      }
      jd = jalaaliMonthLength(jy, jm)
    }
    remaining -= 1
  }
  return { jy, jm, jd }
}

export function toPersianDigits(value) {
  const fa = String(value)
  const map = { '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹' }
  return fa.replace(/\d/g, (d) => map[d])
}