'use client'

import { useEffect, useState } from 'react'
import { apiFetch, type SecurityPolicyResponse } from '@danvic/api-client'
import { Badge, Button, FormMessage } from '@danvic/ui'

const fallbackPolicy: SecurityPolicyResponse = {
  policy: {
    admins: { login: 'required' },
    authors: { login: 'required' },
    students: { login: 'optional', beforeEnrollment: 'required' },
  },
  canManageMfaPolicy: false,
}

export function MfaPolicyPanel() {
  const [value, setValue] = useState<SecurityPolicyResponse>(fallbackPolicy)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void apiFetch<SecurityPolicyResponse>('/api/settings/security/mfa')
      .then((result) => active && setValue(result))
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load MFA policy')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const save = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await apiFetch<SecurityPolicyResponse>('/api/settings/security/mfa', {
        method: 'PUT',
        body: JSON.stringify(value.policy),
      })
      setValue(result)
      setMessage('MFA policy saved from the server response.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save MFA policy')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ad-section ad-section--plain ad-mfa-policy" aria-labelledby="mfa-policy-title">
      <div className="ad-section-heading">
        <div>
          <h2 id="mfa-policy-title">MFA policy</h2>
          <p>Mandatory controls are enforced by the backend for every account.</p>
        </div>
        <Badge dot tone={value.canManageMfaPolicy ? 'green' : 'blue'}>
          {value.canManageMfaPolicy ? 'Editable by permission' : 'Effective policy'}
        </Badge>
      </div>
      {loading ? <p className="ad-empty-line">Loading MFA policy…</p> : null}
      {!loading ? (
        <>
          <div className="ad-policy-grid">
            <div><strong>Admins</strong><span>Required at every sign-in</span></div>
            <div><strong>Authors</strong><span>Required at every sign-in</span></div>
            <div><strong>Students</strong><span>Optional at sign-in; required before enrollment or payment</span></div>
          </div>
          {value.canManageMfaPolicy ? (
            <div className="ad-policy-actions">
              <p>Admin and author MFA cannot be disabled from this panel.</p>
              <Button busy={busy} onClick={() => void save()}>Save policy</Button>
            </div>
          ) : null}
          <FormMessage tone="success">{message}</FormMessage>
          <FormMessage>{error}</FormMessage>
        </>
      ) : null}
    </section>
  )
}
