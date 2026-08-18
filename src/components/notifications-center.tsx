'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, type AdminNotification } from '@danvic/api-client'
import { Button, FormMessage } from '@danvic/ui'
import { Bell, Check, RefreshCw } from 'lucide-react'

const timeAgo = (iso: string): string => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function NotificationCenter() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch<{ notifications: AdminNotification[] }>('/api/notifications')
      setItems(result.notifications)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Notifications could not be loaded')
    } finally {
      setLoading(false)
    }
  }, [])

  const toggle = () => setOpen((value) => !value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const unreadCount = items.filter((item) => !item.readAt).length

  const markAllRead = async () => {
    try {
      await apiFetch<{ updatedCount: number }>('/api/notifications/read-all', {
        method: 'POST',
        body: '{}',
      })
      setItems((list) =>
        list.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Notifications could not be updated')
    }
  }

  const openNotification = async (item: AdminNotification) => {
    try {
      if (!item.readAt) {
        const result = await apiFetch<{ notification: AdminNotification }>(
          `/api/notifications/${encodeURIComponent(item.id)}/read`,
          { method: 'POST', body: '{}' },
        )
        setItems((list) =>
          list.map((entry) => (entry.id === item.id ? result.notification : entry)),
        )
      }
      setOpen(false)
      if (item.link) router.push(item.link)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Notification could not be updated')
    }
  }

  return (
    <div className="ad-notif" ref={containerRef}>
      <button
        type="button"
        className="sb-icon-button ad-notif-trigger"
        aria-label={open ? 'Close notifications' : `Notifications (${unreadCount} unread)`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
      >
        <Bell aria-hidden="true" />
      </button>
      {unreadCount ? (
        <span className="ad-notif-badge" aria-hidden="true">
          {unreadCount}
        </span>
      ) : null}
      {open ? (
        <div className="ad-notif-panel" role="dialog" aria-modal="true" aria-label="Notifications">
          <div className="ad-notif-head">
            <div>
              <h2>Notifications</h2>
              <p>
                {unreadCount
                  ? `${unreadCount} unread`
                  : items.length
                    ? 'All caught up'
                    : 'No notifications'}
              </p>
            </div>
            <div className="ad-notif-actions">
              {unreadCount ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => void markAllRead()}>
                  <Check aria-hidden="true" /> Mark all read
                </Button>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Refresh notifications"
                onClick={() => void load()}
                busy={loading}
              >
                <RefreshCw aria-hidden="true" />
              </Button>
            </div>
          </div>
          {items.length ? (
            <ul className="ad-notif-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="ad-notif-item"
                    data-unread={item.readAt ? undefined : true}
                    onClick={() => void openNotification(item)}
                  >
                    <span className="ad-notif-copy">
                      <strong>{item.title}</strong>
                      <span className="ad-notif-body">{item.body}</span>
                      <small>{timeAgo(item.createdAt)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <p className="ad-empty-line">No notifications yet.</p>
          ) : null}
          <FormMessage>{error}</FormMessage>
        </div>
      ) : null}
    </div>
  )
}
