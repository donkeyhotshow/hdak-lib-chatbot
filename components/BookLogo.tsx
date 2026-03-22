import React from 'react'

interface BookLogoProps {
  size?: 'sm' | 'md' | 'lg'
}

export function BookLogo({ size = 'md' }: BookLogoProps) {
  if (size === 'lg') {
    return (
      <svg width="60" height="47" viewBox="0 0 60 47" fill="none" aria-hidden="true">
        <path d="M30 6C30 6 21 4.5 8 7.5L7 38C20 35 29 37 30 37L30 6Z"
          fill="rgba(56,32,16,.065)" stroke="rgba(56,32,16,.18)" strokeWidth=".9"/>
        <path d="M30 6C30 6 39 4.5 52 7.5L53 38C40 35 31 37 30 37L30 6Z"
          fill="rgba(56,32,16,.045)" stroke="rgba(56,32,16,.14)" strokeWidth=".9"/>
        <line x1="30" y1="5.5" x2="30" y2="37.5" stroke="rgba(56,32,16,.28)" strokeWidth="1.3"/>
        <line x1="30" y1="5.5" x2="30" y2="37.5" stroke="rgba(184,124,50,.42)" strokeWidth=".55"/>
        <line x1="12" y1="14" x2="25" y2="13.2" stroke="rgba(56,32,16,.12)" strokeWidth=".85"/>
        <line x1="12" y1="18" x2="25" y2="17.2" stroke="rgba(56,32,16,.12)" strokeWidth=".85"/>
        <line x1="12" y1="22" x2="25" y2="21.2" stroke="rgba(56,32,16,.12)" strokeWidth=".85"/>
        <line x1="35" y1="13.2" x2="48" y2="14"   stroke="rgba(56,32,16,.12)" strokeWidth=".85"/>
        <line x1="35" y1="17.2" x2="48" y2="18"   stroke="rgba(56,32,16,.12)" strokeWidth=".85"/>
        <line x1="35" y1="21.2" x2="48" y2="22"   stroke="rgba(56,32,16,.12)" strokeWidth=".85"/>
        <ellipse cx="30" cy="38.5" rx="20" ry="2" fill="rgba(56,32,16,.06)"/>
      </svg>
    )
  }

  const s = size === 'sm' ? { w: 22, h: 16 } : { w: 26, h: 20 };

  return (
    <svg width={s.w} height={s.h} viewBox="0 0 22 16" fill="none" aria-hidden="true" style={{ opacity: 0.9 }}>
      <path d="M11 2C11 2 8 1.2 3 2.5L2.5 13.5C7.5 12.2 10.5 13 11 13L11 2Z"
        fill="rgba(184,124,50,.18)" stroke="rgba(184,124,50,.55)" strokeWidth=".7"/>
      <path d="M11 2C11 2 14 1.2 19 2.5L19.5 13.5C14.5 12.2 11.5 13 11 13L11 2Z"
        fill="rgba(184,124,50,.12)" stroke="rgba(184,124,50,.45)" strokeWidth=".7"/>
      <line x1="11" y1="1.8" x2="11" y2="13" stroke="rgba(184,124,50,.78)" strokeWidth=".75"/>
      <line x1="5"  y1="6"   x2="9.5" y2="5.6"  stroke="rgba(184,124,50,.25)" strokeWidth=".55"/>
      <line x1="5"  y1="8.3" x2="9.5" y2="7.9"  stroke="rgba(184,124,50,.25)" strokeWidth=".55"/>
      <line x1="12.5" y1="5.6" x2="17" y2="6"    stroke="rgba(184,124,50,.25)" strokeWidth=".55"/>
      <line x1="12.5" y1="7.9" x2="17" y2="8.3"  stroke="rgba(184,124,50,.25)" strokeWidth=".55"/>
    </svg>
  )
}
