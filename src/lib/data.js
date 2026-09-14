export const TYPE_META = {
  private: { label: 'انفرادی', tone: 'clay' },
  group: { label: 'گروهی', tone: 'green' },
  spar: { label: 'مسابقه', tone: 'gold' },
  technique: { label: 'تکنیک', tone: 'blue' },
}

export const COURTS = [
  { label: 'زمین خاکی', tone: 'clay' },
  { label: 'زمین آبی', tone: 'blue' },
  { label: 'زمین چمن', tone: 'green' },
]

export const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
export const MINUTES = [0, 30]

export function durationOptions() {
  return [30, 45, 60, 90, 120]
}

export function timeToFa(hour, minute) {
  const fa =
    String(hour).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]) +
    ':' +
    String(minute).padStart(2, '0').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
  return fa
}

export const JALALI_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

export function courtLabel(court) {
  const found = COURTS.find((c) => c.tone === court)
  return found ? found.label : court
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function normalizeDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[^\d]/g, '')
}