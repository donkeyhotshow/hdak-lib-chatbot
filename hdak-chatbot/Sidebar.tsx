'use client'

import { useState } from 'react'
import {
  Search, Sparkles, Link2, Globe, BookOpen,
  FlaskConical, UserCircle, GalleryVertical,
  ChevronRight, ChevronDown, Plus, X,
} from 'lucide-react'

interface SidebarProps {
  open: boolean
  onClose: () => void
  onNewChat: () => void
  onQuery: (q: string) => void
  chatHistory?: { id: string; title: string }[]
  currentChatId?: string
  onSelectChat?: (id: string) => void
}

const QUICK = [
  { label: 'Графік роботи',  query: 'Графік роботи бібліотеки' },
  { label: 'Записатися',     query: 'Як записатися до бібліотеки' },
  { label: 'Контакти',       query: 'Контакти та адреса' },
  { label: 'Правила',        query: 'Правила бібліотеки' },
]

const MAIN_LINKS = [
  {
    Icon: Search,
    label: 'Пошук в каталозі',
    sub: 'Знайти за автором або темою',
    href: 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm',
  },
  {
    Icon: Sparkles,
    label: 'Нові надходження',
    sub: 'Що з\'явилось у фонді',
    href: 'https://lib-hdak.in.ua/new-acquisitions.html',
  },
  {
    Icon: Link2,
    label: 'Корисні посилання',
    sub: 'Зовнішні бази й портали',
    href: 'https://lib-hdak.in.ua/helpful-links.html',
  },
  {
    Icon: Globe,
    label: 'Сайт бібліотеки',
    sub: 'lib-hdak.in.ua',
    href: 'https://lib-hdak.in.ua/',
  },
]

const EXTRA_LINKS = [
  {
    Icon: BookOpen,
    label: 'Репозитарій ХДАК',
    sub: 'Підручники, статті, роботи',
    href: 'https://repository.ac.kharkov.ua/home',
  },
  {
    Icon: FlaskConical,
    label: 'Наукова інформація',
    sub: 'Пошук наукових джерел',
    href: 'https://lib-hdak.in.ua/search-scientific-info.html',
  },
  {
    Icon: UserCircle,
    label: 'Авторські профілі',
    sub: 'ORCID, Scopus, Google Scholar',
    href: 'https://lib-hdak.in.ua/author-profiles-instructions.html',
  },
  {
    Icon: GalleryVertical,
    label: 'Виставки',
    sub: 'Віртуальні тематичні колекції',
    href: 'https://lib-hdak.in.ua/virtual-exhibitions.html',
  },
]

const BOOK_LOGO = (
  <svg width="26" height="19" viewBox="0 0 26 19" fill="none">
    <path d="M13 2.5C13 2.5 9.5 1.5 4 3L3.5 16C9 14.5 12.5 15.5 13 15.5L13 2.5Z"
      fill="rgba(184,120,48,0.18)" stroke="rgba(184,120,48,0.55)" strokeWidth="0.75"/>
    <path d="M13 2.5C13 2.5 16.5 1.5 22 3L22.5 16C17 14.5 13.5 15.5 13 15.5L13 2.5Z"
      fill="rgba(184,120,48,0.12)" stroke="rgba(184,120,48,0.44)" strokeWidth="0.75"/>
    <line x1="13" y1="2" x2="13" y2="15.5" stroke="rgba(184,120,48,0.78)" strokeWidth="0.8"/>
    <line x1="6"  y1="6.5" x2="11" y2="6.1"  stroke="rgba(184,120,48,0.25)" strokeWidth="0.55"/>
    <line x1="6"  y1="8.8" x2="11" y2="8.4"  stroke="rgba(184,120,48,0.25)" strokeWidth="0.55"/>
    <line x1="6"  y1="11" x2="11" y2="10.6" stroke="rgba(184,120,48,0.18)" strokeWidth="0.55"/>
    <line x1="15" y1="6.1" x2="20" y2="6.5"  stroke="rgba(184,120,48,0.25)" strokeWidth="0.55"/>
    <line x1="15" y1="8.4" x2="20" y2="8.8"  stroke="rgba(184,120,48,0.25)" strokeWidth="0.55"/>
    <line x1="15" y1="10.6" x2="20" y2="11"  stroke="rgba(184,120,48,0.18)" strokeWidth="0.55"/>
  </svg>
)

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '9px', fontWeight: 500, letterSpacing: '0.13em',
  textTransform: 'uppercase', color: 'rgba(184,120,48,0.42)',
  padding: '0 16px', marginTop: '18px', marginBottom: '5px',
  display: 'block',
}

const DIVIDER = (
  <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', margin: '10px 16px' }} />
)

function NavLink({
  Icon, label, sub, href,
}: { Icon: React.ElementType; label: string; sub: string; href: string }) {
  const [hov, setHov] = useState(false)
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '7px 16px', textDecoration: 'none', transition: 'all 0.12s',
        background: hov ? 'rgba(255,255,255,0.04)' : 'transparent',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{
        width: '28px', height: '28px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px',
      }}>
        <Icon size={14} color={hov ? 'rgba(184,120,48,0.82)' : 'rgba(184,120,48,0.50)'} strokeWidth={1.5} />
      </div>
      <div>
        <div style={{
          fontSize: '12.5px', fontWeight: 400,
          color: hov ? 'rgba(235,215,185,0.92)' : 'rgba(235,215,185,0.60)',
          lineHeight: 1.2, marginBottom: '2px', transition: 'color 0.12s',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '10px', fontWeight: 300,
          color: hov ? 'rgba(184,120,48,0.55)' : 'rgba(184,120,48,0.32)',
          lineHeight: 1.2, transition: 'color 0.12s',
        }}>
          {sub}
        </div>
      </div>
    </a>
  )
}

export default function Sidebar({
  open, onClose, onQuery, onNewChat,
  chatHistory = [], currentChatId, onSelectChat,
}: SidebarProps) {
  const [expanded, setExpanded] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)

  function handleQuery(q: string) {
    onQuery(q)
    onClose()
  }

  const visibleHistory = historyExpanded ? chatHistory : chatHistory.slice(0, 3)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.42)',
            zIndex: 40,
          }}
        />
      )}

      <aside
        aria-label="Навігація бібліотеки"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: '240px', zIndex: 50,
          background: '#1a0d06',
          backgroundImage: 'linear-gradient(180deg, rgba(184,120,48,0.06) 0%, transparent 30%)',
          borderRight: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.22s cubic-bezier(0.32,0,0.18,1)',
          boxShadow: open ? '4px 0 32px rgba(0,0,0,0.35)' : 'none',
        }}
      >
        {/* ── HEADER ── */}
        <div style={{ padding: '20px 16px 0', position: 'relative', flexShrink: 0 }}>
          <button
            onClick={onClose}
            aria-label="Закрити меню"
            style={{
              position: 'absolute', top: '14px', right: '12px',
              width: '26px', height: '26px',
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={12} color="rgba(184,120,48,0.5)" />
          </button>

          <div style={{ marginBottom: '10px' }}>{BOOK_LOGO}</div>

          <div style={{
            fontFamily: 'var(--fs)', fontSize: '19px', fontStyle: 'italic',
            fontWeight: 500, color: 'rgba(240,222,195,0.88)', lineHeight: 1.1,
          }}>
            Бібліотека
          </div>
          <div style={{
            fontSize: '11px', fontWeight: 500, letterSpacing: '0.15em',
            color: 'rgba(184,120,48,0.72)', textTransform: 'uppercase', marginTop: '1px',
          }}>
            ХДАК
          </div>
          <div style={{
            fontSize: '9px', letterSpacing: '0.1em',
            color: 'rgba(184,120,48,0.36)', textTransform: 'uppercase',
            marginTop: '5px', marginBottom: '4px',
          }}>
            ЧАТ-ПОМІЧНИК БІБЛІОТЕКИ
          </div>
        </div>

        {DIVIDER}

        {/* ── SCROLLABLE NAV ── */}
        <nav style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

          {/* QUICK QUERIES */}
          <span style={LABEL_STYLE}>ШВИДКІ ЗАПИТИ</span>
          {QUICK.map(({ label, query }) => {
            const [hov, setHov] = useState(false)
            return (
              <button
                key={query}
                onClick={() => handleQuery(query)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 16px', fontSize: '12.5px', fontWeight: 400,
                  color: hov ? 'rgba(235,215,185,0.92)' : 'rgba(235,215,185,0.58)',
                  cursor: 'pointer', border: 'none',
                  background: hov ? 'rgba(255,255,255,0.04)' : 'transparent',
                  width: '100%', textAlign: 'left', transition: 'all 0.12s',
                }}
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => setHov(false)}
              >
                <span>{label}</span>
                <ChevronRight size={11} color="rgba(184,120,48,0.38)" />
              </button>
            )
          })}

          {DIVIDER}

          {/* MAIN RESOURCES */}
          <span style={LABEL_STYLE}>РЕСУРСИ БІБЛІОТЕКИ</span>
          {MAIN_LINKS.map(l => <NavLink key={l.href} {...l} />)}

          {DIVIDER}

          {/* COLLAPSIBLE EXTRA */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', fontSize: '11px', fontWeight: 400,
              color: 'rgba(184,120,48,0.45)', background: 'transparent',
              border: 'none', cursor: 'pointer', width: '100%',
              letterSpacing: '0.02em', transition: 'color 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(184,120,48,0.78)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(184,120,48,0.45)' }}
          >
            <ChevronDown
              size={12}
              style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
            />
            {expanded ? 'Менше' : 'Більше ресурсів'}
          </button>

          {expanded && (
            <div style={{ animation: 'fadeUp 0.18s ease' }}>
              {EXTRA_LINKS.map(l => <NavLink key={l.href} {...l} />)}
              {DIVIDER}
            </div>
          )}

          {/* CHAT HISTORY */}
          {chatHistory.length > 0 && (
            <>
              <span style={LABEL_STYLE}>АРХІВ СЕСІЙ</span>
              {visibleHistory.map(chat => {
                const active = chat.id === currentChatId
                const [hov, setHov] = useState(false)
                return (
                  <button
                    key={chat.id}
                    onClick={() => { onSelectChat?.(chat.id); onClose() }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '6px 16px', fontSize: '12px',
                      color: active
                        ? 'rgba(235,215,185,0.92)'
                        : hov ? 'rgba(235,215,185,0.70)' : 'rgba(235,215,185,0.40)',
                      background: active
                        ? 'rgba(255,255,255,0.06)'
                        : hov ? 'rgba(255,255,255,0.03)' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      transition: 'all 0.12s',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                    onMouseEnter={() => setHov(true)}
                    onMouseLeave={() => setHov(false)}
                  >
                    "{chat.title}"
                  </button>
                )
              })}
              {chatHistory.length > 3 && (
                <button
                  onClick={() => setHistoryExpanded(!historyExpanded)}
                  style={{
                    padding: '4px 16px', fontSize: '10.5px',
                    color: 'rgba(184,120,48,0.42)', background: 'transparent',
                    border: 'none', cursor: 'pointer', transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(184,120,48,0.72)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(184,120,48,0.42)' }}
                >
                  {historyExpanded
                    ? '▲ Менше'
                    : `••• Ще ${chatHistory.length - 3}`}
                </button>
              )}
              {DIVIDER}
            </>
          )}
        </nav>

        {/* ── BOTTOM ── */}
        <div style={{
          padding: '10px 14px',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          flexShrink: 0,
        }}>
          <button
            onClick={() => { onNewChat(); onClose() }}
            style={{
              width: '100%', height: '34px',
              background: 'rgba(184,120,48,0.12)',
              border: '0.5px solid rgba(184,120,48,0.28)',
              borderRadius: '8px', color: 'rgba(220,168,78,0.82)',
              fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', cursor: 'pointer', transition: 'all 0.13s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(184,120,48,0.20)'
              el.style.borderColor = 'rgba(184,120,48,0.48)'
              el.style.color = 'rgba(230,178,90,0.95)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(184,120,48,0.12)'
              el.style.borderColor = 'rgba(184,120,48,0.28)'
              el.style.color = 'rgba(220,168,78,0.82)'
            }}
          >
            <Plus size={13} strokeWidth={1.8} />
            НОВИЙ ЧАТ
          </button>
        </div>
      </aside>
    </>
  )
}
