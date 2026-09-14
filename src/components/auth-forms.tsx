'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch, type LoginResult } from '@danvic/api-client'
import {
  AuthLayout,
  Brand,
  Button,
  CodeInput,
  Field,
  FormMessage,
  Input,
  PasswordInput,
} from '@danvic/ui'
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck, Users } from 'lucide-react'
import styles from './auth-layout.module.css'

const features = [
  { icon: ShieldCheck, label: 'Permission-gated operations' },
  { icon: KeyRound, label: 'Required MFA for every administrator' },
  { icon: LockKeyhole, label: 'Every action is audited' },
]

export function LoginForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <AuthLayout
      className={styles.authLayout!}
      eyebrow="Platform administration"
      headline="Learning operations, without the noise."
      description="Securely manage administrators, authors, invitations, and platform access from one composed workspace."
      features={features}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          try {
            const result = await apiFetch<LoginResult>('/api/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
            })
            router.push(result.next)
            router.refresh()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Sign-in failed')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="sb-page-eyebrow">Welcome back</p>
        <h2>Sign in to DANVIC</h2>
        <p>Use your invited administrator account.</p>
        <div className="sb-login-fields">
          <Field label="Work email" required>
            <Input name="email" type="email" autoComplete="username" required />
          </Field>
          <Field label="Password" required>
            <PasswordInput name="password" autoComplete="current-password" required />
          </Field>
          <div className="sb-login-help">
            <span>Secure administrator access</span>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
          <Button size="lg" busy={busy}>
            Sign in securely
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </form>
    </AuthLayout>
  )
}

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  return (
    <AuthLayout
      eyebrow="Account recovery"
      headline="Return to secure operations."
      description="Request a single-use code without revealing whether an administrator account exists."
      features={features}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          try {
            const result = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
              method: 'POST',
              body: JSON.stringify({ email: data.get('email') }),
            })
            setMessage(result.message)
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not request a reset code')
          } finally {
            setBusy(false)
          }
        }}
      >
        <Brand href="/login" />
        <p className="sb-page-eyebrow" style={{ marginTop: 36 }}>
          Password reset
        </p>
        <h2>Request a reset code</h2>
        <p>The six-digit code expires after ten minutes.</p>
        <div className="sb-login-fields">
          <Field label="Work email" required>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Button size="lg" busy={busy}>
            Send reset code
          </Button>
          <FormMessage tone="success">{message}</FormMessage>
          <FormMessage>{error}</FormMessage>
          {message ? (
            <Link className="sb-button sb-button--soft sb-button--lg" href="/reset-password">
              Enter reset code
            </Link>
          ) : null}
        </div>
      </form>
    </AuthLayout>
  )
}

export function ResetPasswordForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <AuthLayout
      eyebrow="Single-use recovery"
      headline="Set a new secure password."
      description="Use the code delivered to your administrator email. A successful reset invalidates every existing access token."
      features={features}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          const password = String(data.get('newPassword') ?? '')
          if (password !== data.get('confirmPassword')) {
            setError('Passwords do not match')
            setBusy(false)
            return
          }
          try {
            await apiFetch('/api/auth/reset-password', {
              method: 'POST',
              body: JSON.stringify({
                email: data.get('email'),
                code: data.get('code'),
                newPassword: password,
              }),
            })
            router.push('/login?reset=complete')
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Password reset failed')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="sb-page-eyebrow">Secure reset</p>
        <h2>Choose a new password</h2>
        <p>Use at least 12 characters.</p>
        <div className="sb-login-fields">
          <Field label="Work email" required>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Reset code" required>
            <CodeInput name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
          </Field>
          <Field label="New password" required>
            <PasswordInput
              name="newPassword"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Confirm password" required>
            <PasswordInput
              name="confirmPassword"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Button size="lg" busy={busy}>
            Reset password
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </form>
    </AuthLayout>
  )
}

export function TwoFactorForm({ setup = false }: { setup?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = searchParams.get('next')
  const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : ''
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  useEffect(() => {
    if (!setup) return
    void apiFetch<{ qrCodeDataUrl: string; secret: string }>('/api/auth/2fa/setup', {
      method: 'POST',
      body: '{}',
    })
      .then((result) => {
        setQrCode(result.qrCodeDataUrl)
        setSecret(result.secret)
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Could not start 2FA setup'),
      )
  }, [setup])
  return (
    <AuthLayout
      className={styles.authLayout!}
      eyebrow={setup ? 'Required security setup' : 'Second factor'}
      headline={setup ? 'Protect the superadmin account.' : 'Confirm it is really you.'}
      description={
        setup
          ? 'Scan the QR code once, then confirm the current code from your authenticator app.'
          : 'Enter the current code from the authenticator linked to this administrator account.'
      }
      features={[
        { icon: CheckCircle2, label: 'Codes are single-use' },
        { icon: ShieldCheck, label: 'Secrets are encrypted at rest' },
        { icon: Users, label: 'Access remains permission-aware' },
      ]}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          try {
            const result = await apiFetch<{ next: string }>(
              setup ? '/api/auth/2fa/confirm' : '/api/auth/2fa/verify',
              { method: 'POST', body: JSON.stringify({ code: data.get('code') }) },
            )
            router.push(next || result.next)
            router.refresh()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Verification failed')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="sb-page-eyebrow">{setup ? 'Authenticator setup' : 'Verification'}</p>
        <h2>{setup ? 'Set up two-factor authentication' : 'Enter your six-digit code'}</h2>
        <p>
          {setup
            ? 'Use Google Authenticator, 1Password, Authy, or another TOTP app.'
            : 'The code changes every 30 seconds.'}
        </p>
        {qrCode ? (
          <Image
            className="sb-qr"
            src={qrCode}
            alt="DANVIC authenticator QR code"
            width={220}
            height={220}
            unoptimized
          />
        ) : null}
        {secret ? (
          <p className="sb-form-message" data-tone="info">
            Manual key: <strong>{secret}</strong>
          </p>
        ) : null}
        <div className="sb-login-fields">
          <Field label="Authenticator code" required>
            <CodeInput
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
          </Field>
          <Button size="lg" busy={busy} disabled={setup && !qrCode}>
            Verify and continue
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </form>
    </AuthLayout>
  )
}

export function AcceptInvitationForm({ token }: { token?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationToken = token ?? searchParams.get('token') ?? ''
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <AuthLayout
      className={styles.authLayout!}
      eyebrow="Secure invitation"
      headline="Welcome to your administrator workspace."
      description="Create your account, then help keep DANVIC learning operations secure."
      features={[{ icon: CheckCircle2, label: 'Single-use invitation' }, ...features.slice(1)]}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          const password = String(data.get('password') ?? '')
          if (password !== data.get('confirmPassword')) {
            setError('Passwords do not match')
            setBusy(false)
            return
          }
          try {
            await apiFetch('/api/invitations/accept', {
              method: 'POST',
              body: JSON.stringify({
                token: invitationToken,
                firstName: data.get('firstName'),
                lastName: data.get('lastName'),
                password,
              }),
            })
            router.push('/login?invitation=accepted')
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Invitation could not be accepted')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="sb-page-eyebrow">Create account</p>
        <h2>Accept administrator invitation</h2>
        <p>Two-factor authentication is required for every administrator account.</p>
        <div className="sb-login-fields">
          <div className="sb-form-grid">
            <Field label="First name" required>
              <Input name="firstName" autoComplete="given-name" required />
            </Field>
            <Field label="Last name" required>
              <Input name="lastName" autoComplete="family-name" required />
            </Field>
          </div>
          <Field label="Create password" hint="Between 12 and 128 characters." required>
            <PasswordInput
              name="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Confirm password" required>
            <PasswordInput
              name="confirmPassword"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Button size="lg" busy={busy}>
            Create administrator account
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </form>
    </AuthLayout>
  )
}
