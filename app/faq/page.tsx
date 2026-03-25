'use client'

import React, { useState } from 'react'

const FAQ_DATA = [
  {
    q: 'Як стати читачем бібліотеки?',
    a: 'Запис проводиться за списками груп або індивідуально. При собі необхідно мати студентський квиток (або залікову книжку) чи читацький квиток. Студенти 1-го курсу записуються за наказом про зарахування.'
  },
  {
    q: 'Який графік роботи бібліотеки?',
    a: 'Ми працюємо з понеділка по п\'ятницю з 9:00 до 16:45. Перерва 13:00 - 13:45. Субота з 9:00 до 13:30. Неділя — вихідний.'
  },
  {
    q: 'Як знайти книгу в електронному каталозі?',
    a: 'Перейдіть до електронного каталогу (кнопка в меню). Ви можете шукати за автором, назвою або ключовими словами.'
  },
  {
    q: 'Чи можна продовжити термін користування книгою онлайн?',
    a: 'Так, ви можете написати нам у чат або зателефонувати за номером (057) 731-27-83. Вкажіть ваше ПІБ та назву книги.'
  },
  {
    q: 'Де знаходиться репозитарій ХДАК?',
    a: 'Цифровий репозитарій доступний цілодобово. Там ви знайдете наукові праці викладачів та студентів.'
  }
]

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <section id="chat-window">
      <div className="chat-container">
        <div id="chat-content" style={{ padding: '40px 0' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '32px',
            fontWeight: 600,
            color: 'var(--dark-espresso)',
            marginBottom: '32px',
            textAlign: 'center',
          }}>
            Часті запитання
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQ_DATA.map((item, idx) => {
              const isOpen = openIdx === idx
              return (
                <div 
                  key={idx}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  style={{
                    background: 'var(--white)',
                    border: `1px solid ${isOpen ? 'var(--gold)' : 'var(--border-mocha)'}`,
                    borderRadius: 16,
                    padding: '16px 20px',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    boxShadow: isOpen ? '0 12px 30px rgba(44, 36, 33, 0.08)' : '0 2px 8px rgba(26, 20, 18, 0.02)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <h3 style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: isOpen ? 'var(--gold)' : 'var(--text-main)',
                      margin: 0,
                      transition: 'color 0.2s',
                    }}>
                      {item.q}
                    </h3>
                    <span style={{ 
                      fontSize: 18, 
                      color: 'var(--gold)', 
                      transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}>+</span>
                  </div>
                  {isOpen && (
                    <div 
                      className="animate-fade-up"
                      style={{
                        marginTop: 12,
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: 'var(--text-muted)',
                        borderTop: '1px solid var(--border-mocha)',
                        paddingTop: 12,
                      }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
