'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Search, BookOpen, Sparkles, FileText, GalleryVertical,
  FlaskConical, UserCircle, Link2, Globe, ChevronLeft,
  Plus, Trash2
} from 'lucide-react'

interface Conversation {
  id: number
  title: string
  createdAt: string
}

const NAV = [
  {
    section: 'КАТАЛОГИ',
    items: [
      { Icon: Search,   label: 'Пошук в каталозі',   href: 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm' },
      { Icon: BookOpen, label: 'Репозитарій ХДАК',    href: 'https://repository.ac.kharkov.ua/home' },
    ]
  },
  {
    section: 'ЧИТАЧАМ',
    items: [
      { Icon: Sparkles,        label: 'Нові надходження', href: 'https://lib-hdak.in.ua/new-acquisitions.html' },
      { Icon: FileText,        label: 'Правила',           href: 'https://lib-hdak.in.ua/rules-library.html' },
      { Icon: GalleryVertical, label: 'Виставки',          href: 'https://lib-hdak.in.ua/virtual-exhibitions.html' },
    ]
  },
  {
    section: 'НАУКА',
    items: [
      { Icon: FlaskConical, label: 'Наукова інформація', href: 'https://lib-hdak.in.ua/search-scientific-info.html' },
      { Icon: UserCircle,   label: 'Авторські профілі',  href: 'https://lib-hdak.in.ua/author-profiles-instructions.html' },
    ]
  },
  {
    section: 'ПОСИЛАННЯ',
    items: [
      { Icon: Link2, label: 'Корисні посилання', href: 'https://lib-hdak.in.ua/helpful-links.html' },
      { Icon: Globe, label: 'Сайт бібліотеки',  href: 'https://lib-hdak.in.ua/' },
    ]
  },
]

const navItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '7px 16px',
  fontSize: 12.5,
  fontWeight: 400,
  color: 'rgba(235,215,185,0.55)',
  textDecoration: 'none',
  background: 'transparent',
  transition: 'all 0.12s',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export function Sidebar({ isOpen, onToggle, onClose }: { isOpen: boolean; onToggle: () => void; onClose?: () => void }) {
  const { id: currentId } = useParams()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    fetch('/api/conversations')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setConversations(data) })
      .catch(() => {})
  }, [])

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Видалити цей діалог?')) return
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id))
        if (Number(currentId) === id) router.push('/')
      }
    } catch {}
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            display: 'none',
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.45)',
          }}
          className="sb-overlay"
        />
      )}

      <aside
        style={{
          width: 240,
          background: '#1c1008',
          borderRight: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          transition: 'width 0.22s cubic-bezier(0.32,0,0.18,1)',
          zIndex: 50,
        }}
      >
        {/* HEADER */}
        <div style={{ padding: '28px 16px 16px' }}>
          <div
            style={{ cursor: 'pointer' }}
            onClick={() => { router.push('/'); if (onClose) onClose() }}
          >
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              fontWeight: 600,
              color: 'rgba(240,225,200,0.88)',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}>
              Бібліотека
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: '0.12em',
              color: 'rgba(184,120,48,0.7)',
              textTransform: 'uppercase',
              marginTop: 2,
            }}>
              ХДАК
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 12,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 6px rgba(74,222,128,0.6)',
            }} />
            <span style={{
              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(184,120,48,0.45)',
            }}>
              ЧАТ-ПОМІЧНИК БІБЛІОТЕКИ
            </span>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', margin: '0 0 8px' }} />

        {/* NAV */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map((group) => (
            <div key={group.section} style={{ marginBottom: 4 }}>
              <div style={{
                fontSize: 9, fontWeight: 500, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'rgba(184,120,48,0.38)',
                padding: '14px 16px 6px',
              }}>
                {group.section}
              </div>
              {group.items.map(({ Icon, label, href }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  style={navItem}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)'
                    ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(235,215,185,0.88)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(235,215,185,0.55)'
                  }}
                >
                  <Icon size={14} strokeWidth={1.5} color="rgba(184,120,48,0.5)" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                </a>
              ))}
            </div>
          ))}

          {/* HISTORY */}
          {conversations.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                fontSize: 9, fontWeight: 500, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'rgba(184,120,48,0.38)',
                padding: '14px 16px 6px',
              }}>
                ДІАЛОГИ
              </div>
              {conversations.map(conv => {
                const isActive = Number(currentId) === conv.id
                return (
                  <div key={conv.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <Link
                      href={`/chat/${conv.id}`}
                      onClick={onClose}
                      style={{
                        ...navItem,
                        flex: 1,
                        background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                        color: isActive ? 'rgba(235,215,185,0.9)' : 'rgba(235,215,185,0.55)',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</span>
                    </Link>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      style={{
                        background: 'transparent', border: 'none',
                        padding: '7px 12px', cursor: 'pointer',
                        color: 'rgba(235,215,185,0.2)',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(235,215,185,0.5)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(235,215,185,0.2)')}
                      aria-label="Видалити"
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </nav>

        {/* BOTTOM */}
        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '12px 16px' }}>
          <button
            onClick={() => { router.push('/'); if (onClose) onClose() }}
            style={{
              width: '100%', height: 36,
              background: 'rgba(184,120,48,0.12)',
              border: '0.5px solid rgba(184,120,48,0.28)',
              borderRadius: 8,
              color: 'rgba(220,168,80,0.88)',
              fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 7, cursor: 'pointer',
              transition: 'all 0.14s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(184,120,48,0.18)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(184,120,48,0.45)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(184,120,48,0.12)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(184,120,48,0.28)'
            }}
          >
            <Plus size={13} strokeWidth={2} />
            НОВИЙ ЧАТ
          </button>
        </div>

        {/* COLLAPSE BUTTON (desktop) */}
        <button
          onClick={onToggle}
          aria-label="Згорнути"
          style={{
            position: 'absolute', right: -12, top: '50%',
            transform: 'translateY(-50%)',
            width: 24, height: 24,
            background: '#1c1008',
            border: '0.5px solid rgba(255,255,255,0.10)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
            transition: 'all 0.14s',
          }}
          className="collapse-edge-btn"
        >
          <ChevronLeft size={12} strokeWidth={1.8} color="rgba(184,120,48,0.7)" />
        </button>
      </aside>

      <style>{`
        @media (max-width: 767px) {
          aside { position: fixed !important; left: 0; top: 0; height: 100% !important; transform: ${isOpen ? 'translateX(0)' : 'translateX(-100%)'}; transition: transform 0.22s cubic-bezier(0.32,0,0.18,1) !important; width: 240px !important; }
          .sb-overlay { display: block !important; }
          .collapse-edge-btn { display: none !important; }
        }
        @media (min-width: 768px) {
          aside { width: ${isOpen ? '240px' : '0px'} !important; overflow: hidden; }
        }
        .sb-overlay { display: block; }
      `}</style>
    </>
  )
}
