'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Conversation {
  id: number
  title: string
  createdAt: string
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { id: currentId } = useParams()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  
  useEffect(() => {
    fetch('/api/conversations')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setConversations(data)
      })
      .catch(() => {})
  }, [])

  const handleEndSession = () => {
    if (confirm('Бажаєте завершити візит та повернутися на головну?')) {
      router.push('/')
      if (onClose) onClose()
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Видалити цей діалог?')) {
      try {
        const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
        if (res.ok) {
          setConversations(prev => prev.filter(c => c.id !== id))
          if (Number(currentId) === id) {
            router.push('/')
          }
        }
      } catch (err) {
        console.error('Failed to delete:', err)
      }
    }
  }

  const DRAWER_LINKS = [
    { section: 'КАТАЛОГИ' },
    { icon: '🔍', name: 'Пошук в каталозі',      url: 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm', dom: 'library-service.com.ua' },
    { icon: '📖', name: 'Репозитарій ХДАК',       url: 'https://repository.ac.kharkov.ua/home',                        dom: 'repository.ac.kharkov.ua' },
    { section: 'ЧИТАЧАМ' },
    { icon: '✨', name: 'Нові надходження',        url: 'https://lib-hdak.in.ua/new-acquisitions.html',                 dom: 'lib-hdak.in.ua' },
    { icon: '📋', name: 'Правила',                url: 'https://lib-hdak.in.ua/rules-library.html',                    dom: 'lib-hdak.in.ua' },
    { icon: '🎭', name: 'Виставки',               url: 'https://lib-hdak.in.ua/virtual-exhibitions.html',              dom: 'lib-hdak.in.ua' },
    { section: 'НАУКА' },
    { icon: '🔬', name: 'Пошук наукової інф.',      url: 'https://lib-hdak.in.ua/search-scientific-info.html',          dom: 'lib-hdak.in.ua' },
    { icon: '👤', name: 'Авторські профілі',       url: 'https://lib-hdak.in.ua/author-profiles-instructions.html',    dom: 'lib-hdak.in.ua' },
    { section: 'ПОСИЛАННЯ' },
    { icon: '🔗', name: 'Корисні посилання',       url: 'https://lib-hdak.in.ua/helpful-links.html',                   dom: 'lib-hdak.in.ua' },
    { icon: '🏛',  name: 'Сайт бібліотеки',        url: 'https://lib-hdak.in.ua/',                                      dom: 'lib-hdak.in.ua' },
  ]

  return (
    <aside className="sidebar" id="sidebar" role="navigation" aria-label="Меню ресурсів">
      <div className="sidebar-header">
        <h1>Бібліотека<span className="sub">ХДАК</span></h1>
        <div className="status-indicator">
          <div className="pulse-dot" aria-hidden="true"></div>
          <span aria-hidden="true">Чат-помічник бібліотеки</span>
        </div>
      </div>
      
      <nav className="sidebar-nav scrollbar-none">
        {DRAWER_LINKS.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-group-label" style={{ marginTop: i === 0 ? 0 : 20 }}>{item.section}</div>
          }
          return (
            <a key={i} href={item.url} target="_blank" rel="noreferrer" className="nav-link">
              <span style={{ fontSize: '1.2rem', marginRight: 8, opacity: 0.8 }}>{item.icon}</span>
              {item.name}
              {item.dom && <span style={{ fontSize: '0.65rem', marginLeft: 'auto', opacity: 0.4 }}>{item.dom}</span>}
            </a>
          )
        })}

        {conversations.length > 0 && (
          <>
            <div className="nav-group-label" style={{ marginTop: 32 }}>Історії чатів</div>
            {conversations.map(conv => {
              const isActive = Number(currentId) === conv.id
              return (
                <Link 
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                  style={{ justifyContent: 'space-between' }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.title}
                  </span>
                  <button 
                    onClick={(e) => handleDelete(e, conv.id)}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', flexShrink: 0 }}
                    aria-label="Видалити"
                  >
                    ✕
                  </button>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="new-chat-btn" onClick={handleEndSession}>
          Новий чат
        </button>
      </div>
    </aside>
  )
}
