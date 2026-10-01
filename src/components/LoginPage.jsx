import { useMemo, useState } from 'react'
import { normalizeDigits } from '../lib/data'
import { toPersianDigits } from '../lib/persianDate'
import { APP_VERSION } from '../lib/version'

function TennisBall({ className = '' }) {
  return (
    <svg viewBox="0 0 100 100" className={`tennis-ball ${className}`} aria-hidden="true">
      <defs>
        <radialGradient id="ballGrad" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#f2ff6e" />
          <stop offset="55%" stopColor="#d8ee4d" />
          <stop offset="100%" stopColor="#a3ba1c" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#ballGrad)" />
      <path
        d="M12 38 Q50 48 88 38 M12 62 Q50 52 88 62"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="3.5"
        fill="none"
      />
      <ellipse cx="50" cy="50" rx="46" ry="46" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    </svg>
  )
}

function CourtArt() {
  return (
    <svg className="court-art" viewBox="0 0 440 300" fill="none" aria-hidden="true">
      <g stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M96 78 L344 78 L404 258 L36 258 Z" />
        <path d="M78 168 L362 168" strokeWidth="2" />
        <path d="M112 120 L328 120" opacity="0.75" />
        <path d="M92 214 L348 214" opacity="0.75" />
        <path d="M220 78 L220 168" opacity="0.5" />
        <path d="M220 168 L220 258" opacity="0.5" />
        <path d="M154 120 L156 214 M286 120 L284 214" opacity="0.35" />
      </g>
      <g stroke="rgba(255,255,255,0.85)" strokeWidth="2.4" strokeLinecap="round">
        <path d="M78 160 L78 176 M362 160 L362 176" />
        <path d="M36 252 L36 264 M404 252 L404 264" opacity="0.7" />
      </g>
      <g className="art-ball">
        <path
          d="M255 132 Q222 116 208 104"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.6"
          strokeDasharray="4 7"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="208" cy="104" r="13" fill="url(#ballGrad)" />
        <path
          d="M197 100 Q208 106 218 99 M200 94 Q206 114 202 115"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="1.6"
          fill="none"
        />
      </g>
    </svg>
  )
}

function Field({ label, value, onChange, placeholder, dir = 'rtl', inputMode, maxLength = 11, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      <div className="field-box">
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          maxLength={maxLength}
        />
      </div>
    </label>
  )
}

export default function LoginPage({ onRequestOtp, onVerifyOtp }) {
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const digits = useMemo(() => normalizeDigits(phone), [phone])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step === 'phone') {
      if (digits.length < 10) {
        setError('شماره موبایل را کامل وارد کنید (۱۱ رقم)')
        return
      }
      setBusy(true)
      try {
        await onRequestOtp(digits)
        setError('')
        setStep('otp')
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setBusy(false)
      }
      return
    }
    if (code.length !== 6) {
      setError('کد تأیید ۶ رقمی را وارد کنید')
      return
    }
    setBusy(true)
    try {
      await onVerifyOtp(digits, code, name.trim())
    } catch (verifyError) {
      setError(verifyError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="hero-brand">
          <span className="brand-mark"><TennisBall /></span>
          <span className="brand-name">تنیس‌یار</span>
        </div>

        <div className="hero-art">
          <CourtArt />
        </div>

        <div className="hero-copy">
          <h2>تمرین‌ها، منظم مثل خط‌های زمین</h2>
          <p>
            برنامه‌ریزی جلسه‌ها برای مربی و هنرجو — با تقویم شمسی دقیق و بدون کوچک‌ترین تداخل زمانی.
          </p>
          <ul className="hero-points">
            <li><span /> جلسه‌های هفتگی تکرارشو، فقط با یک کلیک</li>
            <li><span /> کنترل تداخل زمین و هنرجو</li>
            <li><span /> نمای ماه و هفته، کاملاً شمسی</li>
          </ul>
        </div>

        <p className="hero-foot">ساخته‌شده برای عاشقان زمین خاکی · {APP_VERSION}</p>
      </aside>

      <main className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          {step === 'phone' ? (
            <>
              <div className="lf-head">
                <h2>خوش آمدید</h2>
                <p>فقط با شماره موبایل وارد شوید</p>
              </div>

              <Field
                label="شماره موبایل"
                value={phone}
                onChange={(v) => { setPhone(v); setError('') }}
                placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
                dir="ltr"
                inputMode="numeric"
              />

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="login-submit" disabled={digits.length === 0 || busy}>
                <span>ادامه</span>
                <TennisBall className="submit-ball" />
              </button>

              <p className="login-hint">
                نقش شما از روی شماره تشخیص داده می‌شود — مربی به صفحه زمان‌بندی، هنرجو به برنامه تمرین می‌رود.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                className="step-back"
                onClick={() => { setStep('phone'); setError(''); setCode('') }}
              >
                ‹ بازگشت
              </button>

              <div className="lf-head">
                <h2>کد تأیید</h2>
                <p>
                  کد ارسال‌شده به شماره <span className="lf-num" dir="ltr">{toPersianDigits(digits)}</span> را وارد کنید
                </p>
              </div>

              <Field
                label="کد تأیید"
                value={code}
                onChange={(v) => { setCode(normalizeDigits(v).replace(/\D/g, '')); setError('') }}
                placeholder="۱۲۳۴۵۶"
                dir="ltr"
                inputMode="numeric"
                maxLength={6}
                className="otp-field"
              />

              <Field
                label="نام و نام‌خانوادگی (برای ثبت‌نام جدید)"
                value={name}
                onChange={(v) => { setName(v); setError('') }}
                placeholder="مثلاً: مسعود نجفی"
              />

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="login-submit" disabled={code.length !== 6 || busy}>
                <span>تأیید و ورود</span>
                <TennisBall className="submit-ball" />
              </button>

              <p className="login-hint">
                حساب شما به‌عنوان هنرجو ساخته می‌شود؛ مربی توسط باشگاه تعریف می‌شود.
              </p>
            </>
          )}
        </form>
      </main>
    </div>
  )
}
