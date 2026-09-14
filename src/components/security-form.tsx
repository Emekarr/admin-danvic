'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@danvic/api-client'
import type { AdminProfile } from '@danvic/api-client'
import { Badge, Button, Field, FormMessage, PasswordInput } from '@danvic/ui'
import { Check, Fingerprint } from 'lucide-react'

type Tab = 'password' | 'two-factor'

const TABS: { id: Tab; label: string }[] = [
  { id: 'password', label: 'Password' },
  { id: 'two-factor', label: 'Two-factor' },
]

export function SecurityForm({ admin }: { admin: AdminProfile }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('password')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const enabled = admin.twoFactorEnabled

  return (
    <div className="ad-security-layout">
      <section className="ad-security-details">
        <div className="ad-section-heading">
          <div>
            <h2>Security details</h2>
          </div>
          <Badge dot tone={enabled ? 'green' : 'amber'}>
            {enabled ? 'Protected' : 'At risk'}
          </Badge>
        </div>
        <dl className="ad-details">
          <div>
            <dt>Two-factor</dt>
            <dd>{enabled ? 'Enabled' : 'Not enabled'}</dd>
          </div>
          <div>
            <dt>Password</dt>
            <dd>Required at sign-in</dd>
          </div>
          <div>
            <dt>Administrator</dt>
            <dd>{admin.isSuperAdmin ? 'Super admin' : 'Standard admin'}</dd>
          </div>
        </dl>
      </section>

      <div className="ad-security-tabs" role="tablist" aria-label="Security settings">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="ad-security-tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'password' ? (
        <section className="ad-security-panel" role="tabpanel">
          <div className="ad-section-heading">
            <div>
              <h2>Change password</h2>
              <p>Changing your password signs you out of every active session.</p>
            </div>
          </div>
          <form
            className="ad-security-form"
            onSubmit={async (event) => {
              event.preventDefault()
              setBusy(true)
              setError('')
              const data = new FormData(event.currentTarget)
              const next = String(data.get('newPassword') ?? '')
              if (next !== data.get('confirmPassword')) {
                setError('Passwords do not match')
                setBusy(false)
                return
              }
              try {
                await apiFetch('/api/auth/password', {
                  method: 'POST',
                  body: JSON.stringify({
                    currentPassword: data.get('currentPassword'),
                    newPassword: next,
                  }),
                })
                router.push('/login?password=updated')
                router.refresh()
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'Could not update password')
              } finally {
                setBusy(false)
              }
            }}
          >
            <Field label="Current password" required>
              <PasswordInput name="currentPassword" autoComplete="current-password" required />
            </Field>
            <Field label="New password" hint="Use between 12 and 128 characters." required>
              <PasswordInput
                name="newPassword"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="Confirm new password" required>
              <PasswordInput
                name="confirmPassword"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </Field>
            <Button busy={busy}>Update password</Button>
            <FormMessage>{error}</FormMessage>
          </form>
        </section>
      ) : null}

      {tab === 'two-factor' ? (
        <section className="ad-security-panel" role="tabpanel">
          <div className="ad-section-heading">
            <div>
              <h2>Two-factor authentication</h2>
              <p>An extra layer of protection for your sign-in.</p>
            </div>
          </div>
          <div className="ad-security-2fa">
            <div className="ad-security-2fa-head">
              <span className="ad-security-2fa-icon" data-on={enabled || undefined}>
                <Fingerprint aria-hidden="true" />
              </span>
              <div>
                <h3>{enabled ? 'Authenticator enabled' : 'Authenticator not configured'}</h3>
                <p>
                  {enabled
                    ? 'A one-time code from your authenticator app is required whenever you sign in.'
                    : 'Set up an authenticator app to protect this account. Two-factor authentication is required for every administrator.'}
                </p>
              </div>
            </div>
            <ul className="ad-security-checks">
              {enabled ? (
                <>
                  <li>
                    <Check aria-hidden="true" /> A one-time code is required at every sign-in
                  </li>
                  <li>
                    <Check aria-hidden="true" /> Codes are generated by your authenticator app
                  </li>
                  <li>
                    <Check aria-hidden="true" /> Protects against stolen or reused passwords
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Check aria-hidden="true" /> Required for every administrator
                  </li>
                  <li>
                    <Check aria-hidden="true" /> Required for the super admin
                  </li>
                  <li>
                    <Check aria-hidden="true" /> Uses one-time codes from an authenticator app
                  </li>
                </>
              )}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  )
}
