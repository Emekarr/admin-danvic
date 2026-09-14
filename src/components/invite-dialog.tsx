'use client'

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@danvic/api-client'
import { Button, Field, FormMessage, Input } from '@danvic/ui'
import { Check, MailPlus, Pencil, Plus, X } from 'lucide-react'

type InvitationKind = 'admin' | 'author' | 'student'

const labels: Record<InvitationKind, { singular: string; plural: string }> = {
  admin: { singular: 'admin', plural: 'admins' },
  author: { singular: 'tutor', plural: 'tutors' },
  student: { singular: 'student', plural: 'students' },
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function InviteDialog({ kind }: { kind: InvitationKind }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const label = labels[kind]

  const [emails, setEmails] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const openedByHash = useRef(false)

  const open = () => {
    setMessage('')
    setError('')
    setEditingIndex(null)
    setEditValue('')
    dialogRef.current?.showModal()
    requestAnimationFrame(() => emailInputRef.current?.focus())
  }

  const close = () => {
    dialogRef.current?.close()
  }

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === '#invite' && !openedByHash.current) {
        openedByHash.current = true
        open()
      }
    }
    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [])

  const addEmail = () => {
    const value = draft.trim().toLowerCase()
    if (!value) return
    if (!emailPattern.test(value)) {
      setError('Enter a valid email address.')
      return
    }
    if (emails.includes(value)) {
      setError('That email is already on the list.')
      return
    }
    setEmails((list) => [...list, value])
    setDraft('')
    setError('')
  }

  const startEditing = (index: number) => {
    setEditingIndex(index)
    setEditValue(emails[index] ?? '')
    setError('')
  }

  const commitEdit = () => {
    if (editingIndex === null) return
    const value = editValue.trim().toLowerCase()
    if (!value) return
    if (value === emails[editingIndex]) {
      setEditingIndex(null)
      setEditValue('')
      setError('')
      return
    }
    if (!emailPattern.test(value)) {
      setError('Enter a valid email address.')
      return
    }
    if (emails.includes(value)) {
      setError('That email is already on the list.')
      return
    }
    setEmails((list) => {
      const next = [...list]
      next[editingIndex] = value
      return next
    })
    setEditingIndex(null)
    setEditValue('')
    setError('')
  }

  const removeEmail = (index: number) => {
    setEmails((list) => list.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
      setEditValue('')
    }
  }

  const send = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await apiFetch<{ invitations: Array<{ email: string; status: string }> }>(
        `/api/invitations/${kind}`,
        {
          method: 'POST',
          body: JSON.stringify({
            emails,
          }),
        },
      )
      const queued = result.invitations.filter((item) => item.status === 'queued').length
      const limited = result.invitations.filter(
        (item) => item.status === 'resend-limit-reached',
      ).length
      let message = `${queued} invitation${queued === 1 ? '' : 's'} queued.`
      if (limited) {
        message += ` ${limited} skipped — max 3 resends within 24 hours.`
      }
      setMessage(message)
      setEmails([])
      setDraft('')
      setEditingIndex(null)
      setEditValue('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send invitations')
    } finally {
      setBusy(false)
    }
  }

  const canSend = emails.length > 0

  return (
    <>
      <Button type="button" onClick={open}>
        <MailPlus aria-hidden="true" /> Invite {label.plural}
      </Button>
      <dialog ref={dialogRef} className="ad-dialog" aria-labelledby="ad-dialog-title">
        <div className="ad-dialog-head">
          <h2 id="ad-dialog-title">Invite {label.plural}</h2>
          <Button type="button" size="icon" variant="ghost" aria-label="Close" onClick={close}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="ad-dialog-body">
          <Field
            label="Email addresses"
            hint="Add one email at a time, then send them all together."
          >
            <div className="ad-email-row">
              <Input
                ref={emailInputRef}
                className="ad-email-input"
                type="email"
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addEmail()
                  }
                }}
                placeholder={`${label.singular}@company.com`}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addEmail}
                disabled={!emailPattern.test(draft.trim())}
              >
                <Plus aria-hidden="true" /> Add
              </Button>
            </div>
          </Field>
          {emails.length ? (
            <div className="ad-email-chips">
              {emails.map((email, index) =>
                editingIndex === index ? (
                  <span className="ad-email-chip ad-email-chip--editing" key={email}>
                    <Input
                      className="ad-email-chip-input"
                      type="email"
                      value={editValue}
                      autoFocus
                      onChange={(event) => setEditValue(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          commitEdit()
                        } else if (event.key === 'Escape') {
                          setEditingIndex(null)
                          setEditValue('')
                        }
                      }}
                      onBlur={commitEdit}
                      aria-label="Edit email address"
                    />
                    <button
                      type="button"
                      className="ad-email-chip-save"
                      aria-label="Save email"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        commitEdit()
                      }}
                    >
                      <Check aria-hidden="true" />
                    </button>
                  </span>
                ) : (
                  <span className="ad-email-chip" key={email}>
                    <button
                      type="button"
                      className="ad-email-chip-value"
                      onClick={() => startEditing(index)}
                      title="Edit email"
                    >
                      <Pencil aria-hidden="true" />
                      {email}
                    </button>
                    <button
                      type="button"
                      className="ad-email-chip-remove"
                      aria-label={`Remove ${email}`}
                      onClick={() => removeEmail(index)}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </span>
                ),
              )}
            </div>
          ) : null}
          <p className="ad-dialog-count">
            {emails.length} email{emails.length === 1 ? '' : 's'} ready to send
          </p>
          <FormMessage tone="success">{message}</FormMessage>
          <FormMessage>{error}</FormMessage>
        </div>
        <div className="ad-dialog-footer">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button busy={busy} disabled={!canSend} onClick={send}>
            <MailPlus aria-hidden="true" /> Send invitations
          </Button>
        </div>
      </dialog>
    </>
  )
}
