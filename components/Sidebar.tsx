'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Search, BookOpen, Sparkles, FileText, GalleryVertical,
  FlaskConical, UserCircle, Link2, Globe, ChevronLeft, Plus, Trash2, MoreHorizontal
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
      { Icon: Search,          label: 'Пошук в каталозі',    href: 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm' },
      { Icon: BookOpen,        label: 'Репозитарій ХДАК',     href: 'https://repository.ac.kharkov.ua/home' },
    ]
  },
  {
    section: 'ЧИТАЧАМ',
    items: [
      { Icon: Sparkles,        label: 'Нові надходження',     href: 'https://lib-hdak.in.ua/new-acquisitions.html' },
      { Icon: FileText,        label: 'Правила',              href: 'https://lib-hdak.in.ua/rules-library.html' },
      { Icon: GalleryVertical, label: 'Виставки',             href: 'https://lib-hdak.in.ua/virtual-exhibitions.html' },
    ]
  },
  {
    section: 'НАУКА',
    items: [
      { Icon: FlaskConical, label: 'Наукова інформація',    href: 'https://lib-hdak.in.ua/search-scientific-info.html' },
      { Icon: UserCircle,   label: 'Авторські профілі',     href: 'https://lib-hdak.in.ua/author-profiles-instructions.html' },
    ]
  },
  {
    section: 'ПОСИЛАННЯ',
    items: [
      { Icon: Link2, label: 'Корисні посилання', href: 'https://lib-hdak.in.ua/helpful-links.html' },
      { Icon: Globe, label: 'Сайт бібліотеки',   href: 'https://lib-hdak.in.ua/' },
    ]
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
            <h1
              style={{ cursor: 'pointer' }}
              onClick={() => { router.push('/'); if (onClose) onClose() }}
            >
              Бібліотека<span className="sub">ХДАК</span>
            </h1>

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
            <span>Чат-помічник бібліотеки</span>
          </div>
        </div>

        {/* NAV */}
        <nav className="sidebar-nav scrollbar-none">
          {NAV.map(({ section, items }, gi) => (
            <div key={section}>
              <div className="nav-group-label" style={{ marginTop: gi === 0 ? 0 : 20 }}>
                {section}
              </div>
              {items.map(({ Icon, label, href }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="nav-link"
                >
                  <Icon size={14} strokeWidth={1.5} style={{ flexShrink: 0, opacity: 0.7 }} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          ))}

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
            className="new-chat-btn"
            onClick={() => { router.push('/'); if (onClose) onClose() }}
          >
            <Plus size={13} strokeWidth={2.5} style={{ marginRight: 6 }} />
            Новий чат
          </button>
        </div>
      </aside>

      <style>{`
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
