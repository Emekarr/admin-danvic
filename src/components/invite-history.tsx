'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch, type InvitationRecord } from '@danvic/api-client'
import { Badge, Button, FormMessage } from '@danvic/ui'
import { History, RefreshCw } from 'lucide-react'

type InvitationKind = 'admin' | 'author' | 'student'

const invitationStatus = (item: InvitationRecord) =>
  item.acceptedAt ? 'accepted' : item.deliveryError ? 'failed' : item.sentAt ? 'sent' : 'queued'

export function InviteHistory({ kind }: { kind: InvitationKind }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<InvitationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch<{ invitations: InvitationRecord[] }>(
        `/api/invitations/${kind}`,
        { cache: 'no-store' },
      )
      setItems(result.invitations)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load invitations')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [kind])

  const toggle = () => {
    if (!open) void load()
    setOpen((value) => !value)
  }

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

  return (
    <div className="ad-invite-actions" ref={containerRef}>
      <Button
        type="button"
        variant="secondary"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
      >
        <History aria-hidden="true" /> See invite history
      </Button>
      {open ? (
        <div
          className="ad-invite-history"
          role="dialog"
          aria-modal="true"
          aria-label="Invitation history"
        >
          <div className="ad-invite-history-head">
            <div>
              <h2>Invitation history</h2>
              <p>
                {items.length} invitation{items.length === 1 ? '' : 's'} sent
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Refresh invitations"
              onClick={() => void load()}
              busy={loading}
            >
              <RefreshCw aria-hidden="true" />
            </Button>
          </div>
          {items.length ? (
            <div className="sb-table-wrap ad-invite-history-table">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Sent</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const value = invitationStatus(item)
                    return (
                      <tr key={item.id}>
                        <td>
                          <span className="sb-cell-primary">{item.email}</span>
                          {item.deliveryError ? (
                            <span className="sb-cell-secondary">{item.deliveryError}</span>
                          ) : null}
                        </td>
                        <td>
                          <Badge
                            dot
                            tone={
                              value === 'accepted'
                                ? 'green'
                                : value === 'failed'
                                  ? 'red'
                                  : value === 'sent'
                                    ? 'blue'
                                    : 'amber'
                            }
                          >
                            {value}
                          </Badge>
                        </td>
                        <td>
                          {item.sentAt
                            ? new Date(item.sentAt).toLocaleDateString('en-NG')
                            : 'Pending'}
                        </td>
                        <td>{new Date(item.expiresAt).toLocaleDateString('en-NG')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : !loading ? (
            <p className="ad-empty-line">No invitations yet.</p>
          ) : null}
          <FormMessage>{error}</FormMessage>
        </div>
      ) : null}
    </div>
  )
}
