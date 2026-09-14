import { useEffect, useRef, useState } from 'react'
import runAgent from '../lib/agent'
import { sessionLabel } from '../lib/agent'
import { toPersianDigits } from '../lib/persianDate'
import { PlusIcon, TrashIcon } from './icons'

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-4.3 3.6c-.5.4-1.2 0-1.2-.6V6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="9" cy="9.5" r="1.1" fill="currentColor" />
      <circle cx="12.5" cy="9.5" r="1.1" fill="currentColor" />
      <circle cx="16" cy="9.5" r="1.1" fill="currentColor" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M20 4L4 11l7 2.5L13.5 20 20 4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

export default function AgentDrawer({ users, sessions, onAddSessions, onRemoveSession }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text:
        'سلام علی! من دستیار چیدمان تنیس‌یارم 🎾\nیه جمله بگو تا برنامه بسازم:\n«هر شنبه ساعت ۱۰ برای مسعود ۱۰ جلسه بچین»',
    },
  ])
  const listRef = useRef(null)
  const typeTimer = useRef(null)

  useEffect(() => () => clearTimeout(typeTimer.current), [])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, typing])

  const send = (text) => {
    const clean = text.trim()
    if (!clean || typing) return
    setMessages((m) => [...m, { role: 'user', text: clean }])
    setDraft('')
    setTyping(true)
    typeTimer.current = setTimeout(() => {
      const answer = runAgent(clean, { users, sessions })
      setMessages((m) => [...m, { role: 'bot', ...answer }])
      setTyping(false)
    }, 650)
  }

  const commitPreview = (idx, preview) => {
    onAddSessions(preview)
    setMessages((m) =>
      m.map((msg, i) =>
        i === idx ? { ...msg, preview: null, text: `ثبت شد ✓ — ${toPersianDigits(preview.length)} جلسه افزوده شد` } : msg,
      ),
    )
  }

  return (
    <>
      <button
        className={`agent-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="دستیار تنیس‌یار"
        aria-label="دستیار هوشمند"
      >
        {open ? '×' : <ChatIcon />}
      </button>

      {open && (
        <aside className="agent-drawer" dir="rtl">
          <div className="agent-head">
            <span className="agent-ball" />
            <div>
              <strong>دستیار تنیس‌یار</strong>
              <span className="agent-sub">نسخه‌ی محلی · بدون اینترنت</span>
            </div>
            <button className="agent-close" onClick={() => setOpen(false)} aria-label="بستن">×</button>
          </div>

          <div className="agent-msgs" ref={listRef}>
            {messages.map((msg, i) => (
              <div key={msg.role + i} className={`agent-msg ${msg.role}`}>
                {msg.text}
                {msg.kind === 'preview' && msg.preview && (
                  <div className="agent-preview">
                    <span className="agent-preview-desc">{msg.desc}</span>
                    <ul>
                      {msg.preview.slice(0, 3).map((s) => (
                        <li key={`${s.jy}-${s.jm}-${s.jd}-${s.hour}`}>{sessionLabel(s, users)}</li>
                      ))}
                      {msg.preview.length > 3 && (
                        <li className="agent-more">
                          + {toPersianDigits(msg.preview.length - 3)} جلسه دیگر…
                        </li>
                      )}
                    </ul>
                    <button className="btn-primary sm" onClick={() => commitPreview(i, msg.preview)}>
                      <PlusIcon /> ثبت همه ({toPersianDigits(msg.preview.length)})
                    </button>
                  </div>
                )}
                {msg.kind === 'sessions' && msg.data && (
                  <div className="agent-preview">
                    <ul>
                      {msg.data.slice(0, 5).map((s) => (
                        <li key={s.id} className="agent-del">
                          <span>{sessionLabel(s, users)}</span>
                          <button
                            className="icon-btn danger"
                            title="حذف"
                            onClick={() => {
                              onRemoveSession(s.id)
                              setMessages((m) =>
                                m.map((mm, k) =>
                                  k === i ? { ...mm, text: `حذف شد ✓ — ${sessionLabel(s, users)}`, kind: 'done' } : mm,
                                ),
                              )
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {msg.kind === 'chips' && msg.chips && (
                  <div className="agent-chips">
                    {msg.chips.map((c) => (
                      <button key={c} onClick={() => send(c)}>{c}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="agent-msg bot typing">
                <span /><span /><span />
              </div>
            )}
          </div>

          <form
            className="agent-input"
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="مثلاً: هر شنبه ساعت ۱۰ برای مسعود بچین…"
              aria-label="گفتگو با دستیار"
            />
            <button type="submit" disabled={!draft.trim()} aria-label="ارسال">
              <SendIcon />
            </button>
          </form>
        </aside>
      )}
    </>
  )
}