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

  return (
    <aside className="sidebar" id="sidebar" role="navigation" aria-label="Меню консьєржа">
      <div className="sidebar-header">
        <h1>ХДАК<span className="sub">Concierge</span></h1>
        <div className="status-indicator">
          <div className="pulse-dot" aria-hidden="true"></div>
          <span aria-hidden="true">Premium Intelligence</span>
        </div>
      </div>
      
      <nav className="sidebar-nav scrollbar-none">
        <div className="nav-group-label">Сервіси</div>
        <Link href="/" className={`nav-link ${!currentId ? 'active' : ''}`} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Новий сеанс
        </Link>
        
        <div className="nav-group-label">Знання</div>
        <a href="https://lib-hdak.in.ua/" target="_blank" rel="noreferrer" className="nav-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          Е-Каталог
        </a>
        <Link href="/?q=Режим роботи" className="nav-link" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Режим роботи
        </Link>

        {conversations.length > 0 && (
          <>
            <div className="nav-group-label" style={{ marginTop: 32 }}>Історія діалогів</div>
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
          Завершити візит
        </button>
      </div>
    </aside>
  )
}
