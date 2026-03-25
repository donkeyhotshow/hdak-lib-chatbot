'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Search,
  Sparkles,
  Link2,
  Globe,
  BookOpen,
  FlaskConical,
  UserCircle,
  GalleryVertical,
  ChevronRight,
  ChevronDown,
  Plus,
  ChevronLeft,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'

interface Conversation {
  id: number
  title: string
  createdAt: string
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 500,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  color: 'rgba(184,120,48,0.42)',
  padding: '0 16px',
  marginTop: '4px',
  marginBottom: '4px'
}

const dividerStyle: React.CSSProperties = {
  height: '0.5px',
  background: 'rgba(255,255,255,0.06)',
  margin: '10px 16px'
}

// Секція 1: Швидкі запити
const QUICK = [
  { label: 'Графік роботи',  query: 'Графік роботи бібліотеки' },
  { label: 'Записатися',     query: 'Як записатися до бібліотеки' },
  { label: 'Контакти',       query: 'Контакти та адреса' },
  { label: 'Правила',        query: 'Правила бібліотеки' },
]

// Секція 2: Ресурси бібліотеки
const MAIN_LINKS = [
  {
    Icon: Search,
    label: 'Пошук в каталозі',
    sub: 'Знайти книги за автором або темою',
    href: 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm',
  },
  {
    Icon: Sparkles,
    label: 'Нові надходження',
    sub: 'Що з\'явилось у фонді бібліотеки',
    href: 'https://lib-hdak.in.ua/new-acquisitions.html',
  },
  {
    Icon: Link2,
    label: 'Корисні посилання',
    sub: 'Зовнішні бази даних і портали',
    href: 'https://lib-hdak.in.ua/helpful-links.html',
  },
  {
    Icon: Globe,
    label: 'Сайт бібліотеки',
    sub: 'lib-hdak.in.ua',
    href: 'https://lib-hdak.in.ua/',
  },
]

// Секція 3: Більше ресурсів
const EXTRA_LINKS = [
  {
    Icon: BookOpen,
    label: 'Репозитарій ХДАК',
    sub: 'Підручники, статті, кваліфікаційні роботи',
    href: 'https://repository.ac.kharkov.ua/home',
  },
  {
    Icon: FlaskConical,
    label: 'Наукова інформація',
    sub: 'Пошук наукових джерел за запитом',
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

export function Sidebar({
  isOpen,
  onToggle,
  onClose,
}: {
  isOpen: boolean
  onToggle: () => void
  onClose?: () => void
}) {
  const { id: currentId } = useParams()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showAllChats, setShowAllChats] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)

  // Функція для відправки запиту
  const handleQuickQuery = (query: string) => {
    router.push(`/?q=${encodeURIComponent(query)}`)
    if (onClose) onClose()
  }

  useEffect(() => {
    fetch('/api/conversations')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setConversations(data) })
      .catch(() => {})
  }, [])

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteId(id)
  }

  const confirmDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id))
        if (Number(currentId) === id) router.push('/')
      }
    } catch {}
    setDeleteId(null)
  }

  const displayedConversations = showAllChats ? conversations : conversations.slice(0, 2)

  return (
    <>
      {/* Mobile dark overlay */}
      {isOpen && (
        <div
          className="sb-mobile-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className="sidebar" id="sidebar" role="navigation" aria-label="Меню ресурсів">

        {/* HEADER */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div
              className="sidebar-brand-group"
              style={{ cursor: 'pointer' }}
              onClick={() => { router.push('/'); if (onClose) onClose() }}
            >
              {/* SVG book logo */}
              <div style={{ marginBottom: '10px' }}>
                <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
                  <path d="M14 2.5C14 2.5 10 1.5 4 3L3.5 17C9 15.5 13 16.5 14 16.5L14 2.5Z" fill="rgba(184,120,48,0.18)" stroke="rgba(184,120,48,0.55)" strokeWidth="0.75"/>
                  <path d="M14 2.5C14 2.5 18 1.5 24 3L24.5 17C19 15.5 15 16.5 14 16.5L14 2.5Z" fill="rgba(184,120,48,0.12)" stroke="rgba(184,120,48,0.44)" strokeWidth="0.75"/>
                  <line x1="14" y1="2" x2="14" y2="16.5" stroke="rgba(184,120,48,0.75)" strokeWidth="0.8"/>
                </svg>
              </div>

              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '20px',
                fontWeight: '500',
                fontStyle: 'italic',
                color: 'rgba(240,222,195,0.88)',
                lineHeight: '1.1',
                letterSpacing: '-0.01em',
              }}>
                Бібліотека
              </div>
              <div style={{
                display: 'flex',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-serif)',
                fontSize: '11px',
                fontWeight: '500',
                letterSpacing: '0.14em',
                color: 'rgba(184,120,48,0.72)',
                marginTop: '1px',
                marginBottom: '8px',
              }}>
                ХДАК <span style={{ marginLeft: '6px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400 }}>Intelligence</span>
              </div>
            </div>

            {/* Collapse button — inside header (visible on desktop) */}
            <button
              className="collapse-toggle-btn"
              onClick={onToggle}
              aria-label="Згорнути меню"
              style={{ marginTop: 4 }}
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="status-indicator">
            <div className="pulse-dot" aria-hidden="true" />
            <span>Онлайн</span>
          </div>
        </div>

        {/* NAV */}
        <nav className="sidebar-nav scrollbar-none">
          
          {/* СЕКЦІЯ 1: ШВИДКІ ЗАПИТИ */}
          <div style={sectionLabelStyle}>ШВИДКІ ЗАПИТИ</div>
          {QUICK.map((item) => (
            <button
              key={item.label}
              onClick={() => handleQuickQuery(item.query)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 16px',
                fontSize: '12.5px',
                fontWeight: 400,
                color: 'rgba(235,215,185,0.58)',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                width: '100%',
                transition: 'all 0.12s',
                textAlign: 'left'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = 'rgba(235,215,185,0.90)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'rgba(235,215,185,0.58)'
              }}
            >
              <span>{item.label}</span>
              <ChevronRight size={11} color="rgba(184,120,48,0.35)" />
            </button>
          ))}

          <div style={dividerStyle} />

          {/* СЕКЦІЯ 2: РЕСУРСИ БІБЛІОТЕКИ */}
          <div style={sectionLabelStyle}>РЕСУРСИ БІБЛІОТЕКИ</div>
          {MAIN_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '7px 16px',
                textDecoration: 'none',
                transition: 'all 0.12s',
                background: 'transparent'
              }}
              onMouseEnter={e => {
                const labelEl = e.currentTarget.querySelector('.link-label') as HTMLElement
                const subEl = e.currentTarget.querySelector('.link-sub') as HTMLElement
                if (labelEl) labelEl.style.color = 'rgba(235,215,185,0.92)'
                if (subEl) subEl.style.color = 'rgba(184,120,48,0.55)'
                const iconEl = e.currentTarget.querySelector('.link-icon') as HTMLElement
                if (iconEl) iconEl.style.color = 'rgba(184,120,48,0.85)'
              }}
              onMouseLeave={e => {
                const labelEl = e.currentTarget.querySelector('.link-label') as HTMLElement
                const subEl = e.currentTarget.querySelector('.link-sub') as HTMLElement
                if (labelEl) labelEl.style.color = 'rgba(235,215,185,0.60)'
                if (subEl) subEl.style.color = 'rgba(184,120,48,0.35)'
                const iconEl = e.currentTarget.querySelector('.link-icon') as HTMLElement
                if (iconEl) iconEl.style.color = 'rgba(184,120,48,0.50)'
              }}
            >
              <div className="link-icon" style={{
                width: '28px',
                height: '28px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '1px'
              }}>
                <item.Icon size={14} color="rgba(184,120,48,0.50)" strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="link-label" style={{
                  fontSize: '12.5px',
                  fontWeight: 400,
                  color: 'rgba(235,215,185,0.60)',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  {item.label}
                </div>
                <div className="link-sub" style={{
                  fontSize: '10px',
                  fontWeight: 300,
                  color: 'rgba(184,120,48,0.35)',
                  lineHeight: '1.2'
                }}>
                  {item.sub}
                </div>
              </div>
            </a>
          ))}

          <div style={dividerStyle} />

          {/* СЕКЦІЯ 3: БІЛЬШЕ РЕСУРСІВ */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              fontSize: '11px',
              fontWeight: 400,
              color: 'rgba(184,120,48,0.45)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              letterSpacing: '0.02em',
              transition: 'color 0.12s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(184,120,48,0.75)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(184,120,48,0.45)'}
          >
            <ChevronDown 
              size={12} 
              style={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s'
              }}
            />
            <span>{expanded ? '▲ Менше' : '▾ Більше ресурсів'}</span>
          </button>

          {expanded && (
            <div style={{
              animation: 'fadeIn 0.18s ease-out',
              opacity: 1
            }}>
              {EXTRA_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '7px 16px',
                    textDecoration: 'none',
                    transition: 'all 0.12s',
                    background: 'transparent'
                  }}
                  onMouseEnter={e => {
                    const labelEl = e.currentTarget.querySelector('.link-label') as HTMLElement
                    const subEl = e.currentTarget.querySelector('.link-sub') as HTMLElement
                    if (labelEl) labelEl.style.color = 'rgba(235,215,185,0.92)'
                    if (subEl) subEl.style.color = 'rgba(184,120,48,0.55)'
                    const iconEl = e.currentTarget.querySelector('.link-icon') as HTMLElement
                    if (iconEl) iconEl.style.color = 'rgba(184,120,48,0.85)'
                  }}
                  onMouseLeave={e => {
                    const labelEl = e.currentTarget.querySelector('.link-label') as HTMLElement
                    const subEl = e.currentTarget.querySelector('.link-sub') as HTMLElement
                    if (labelEl) labelEl.style.color = 'rgba(235,215,185,0.60)'
                    if (subEl) subEl.style.color = 'rgba(184,120,48,0.35)'
                    const iconEl = e.currentTarget.querySelector('.link-icon') as HTMLElement
                    if (iconEl) iconEl.style.color = 'rgba(184,120,48,0.50)'
                  }}
                >
                  <div className="link-icon" style={{
                    width: '28px',
                    height: '28px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '1px'
                  }}>
                    <item.Icon size={14} color="rgba(184,120,48,0.50)" strokeWidth={1.5} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="link-label" style={{
                      fontSize: '12.5px',
                      fontWeight: 400,
                      color: 'rgba(235,215,185,0.60)',
                      lineHeight: '1.2',
                      marginBottom: '2px'
                    }}>
                      {item.label}
                    </div>
                    <div className="link-sub" style={{
                      fontSize: '10px',
                      fontWeight: 300,
                      color: 'rgba(184,120,48,0.35)',
                      lineHeight: '1.2'
                    }}>
                      {item.sub}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {expanded && <div style={dividerStyle} />}

          {/* HISTORY */}
          {conversations.length > 0 && (
            <>
              <div className="nav-group-label" style={{ marginTop: 24 }}>Діалоги</div>
              {displayedConversations.map(conv => {
                const isActive = Number(currentId) === conv.id
                return (
                  <div key={conv.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <Link
                      href={`/chat/${conv.id}`}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      onClick={onClose}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {conv.title}
                      </span>
                    </Link>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      style={{
                        background: 'transparent', border: 'none',
                        color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
                        padding: '7px 10px', flexShrink: 0,
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)')}
                      aria-label="Видалити"
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                )
              })}
              {conversations.length > 2 && !showAllChats && (
                <button
                  onClick={() => setShowAllChats(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 16px',
                    background: 'transparent', border: 'none',
                    color: 'rgba(235, 215, 185, 0.4)', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                    marginTop: 4, transition: 'color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(235, 215, 185, 0.7)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(235, 215, 185, 0.4)'}
                >
                  <MoreHorizontal size={14} /> Розгорнути (ще {conversations.length - 2})
                </button>
              )}
            </>
          )}
        </nav>

        {/* FOOTER */}
        <div className="sidebar-footer">
          <button
            onClick={() => { router.push('/'); if (onClose) onClose() }}
            style={{
              width: '100%',
              height: '34px',
              background: 'rgba(184,120,48,0.12)',
              border: '0.5px solid rgba(184,120,48,0.28)',
              borderRadius: '8px',
              color: 'rgba(220,168,78,0.82)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.13s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(184,120,48,0.20)'
              e.currentTarget.style.borderColor = 'rgba(184,120,48,0.48)'
              e.currentTarget.style.color = 'rgba(230,178,90,0.95)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(184,120,48,0.12)'
              e.currentTarget.style.borderColor = 'rgba(184,120,48,0.28)'
              e.currentTarget.style.color = 'rgba(220,168,78,0.82)'
            }}
          >
            <Plus size={13} strokeWidth={1.8} />
            + НОВИЙ ЧАТ
          </button>
        </div>
      </aside>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Mobile overlay */
        .sb-mobile-overlay {
          display: none;
        }

        @media (max-width: 767px) {
          .sb-mobile-overlay {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 999;
            background: rgba(0,0,0,0.45);
          }
          aside.sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            height: 100% !important;
            z-index: 1000;
            transform: ${isOpen ? 'translateX(0)' : 'translateX(-100%)'};
            transition: transform 0.22s cubic-bezier(0.32,0,0.18,1) !important;
            width: var(--sb-width) !important;
            margin-left: 0 !important;
          }
          .collapse-toggle-btn {
            display: none !important;
          }
        }

        @media (min-width: 768px) {
          aside.sidebar {
            margin-left: ${isOpen ? '0' : 'calc(-1 * var(--sb-width))'};
            transition: margin-left 0.35s cubic-bezier(0.25, 1, 0.5, 1);
          }
        }
      `}</style>
      
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', padding: '24px', borderRadius: '16px',
            width: '320px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 500, color: '#180c05' }}>Видалити діалог?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#666' }}>Цю дію неможливо буде скасувати.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setDeleteId(null)}
                style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: '10px', cursor: 'pointer', color: '#333', fontWeight: 500 }}
              >
                Скасувати
              </button>
              <button 
                onClick={() => confirmDelete(deleteId)}
                style={{ flex: 1, padding: '12px', background: '#da4444', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#fff', fontWeight: 500 }}
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
