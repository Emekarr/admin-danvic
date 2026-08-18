'use client'

import { useRef } from 'react'
import { Button } from '@danvic/ui'
import { X } from 'lucide-react'

type Attempt = {
  id: string
  attemptNumber: number
  score: number | null
  maxScore: number
  status: string
  passed: boolean | null
}

function attemptLabel(attempt: Attempt) {
  if (attempt.status === 'pending_review' || attempt.score === null) return 'Pending review'
  return `${attempt.score}/${attempt.maxScore}${attempt.passed ? ' · Passed' : ' · Not passed'}`
}

export function AttemptsDialog({
  courseName,
  attempts,
}: {
  courseName: string
  attempts: Attempt[]
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const open = () => dialogRef.current?.showModal()
  const close = () => dialogRef.current?.close()

  return (
    <>
      <button type="button" className="ad-attempts-trigger" onClick={open}>
        View more attempts
      </button>
      <dialog ref={dialogRef} className="ad-dialog" aria-labelledby="ad-attempts-title">
        <div className="ad-dialog-head">
          <h2 id="ad-attempts-title">{courseName} · Attempts</h2>
          <Button type="button" size="icon" variant="ghost" aria-label="Close" onClick={close}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="ad-dialog-body">
          <ol className="ad-attempts-list">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                <span>Attempt {attempt.attemptNumber}</span>
                <strong>{attemptLabel(attempt)}</strong>
              </li>
            ))}
          </ol>
        </div>
        <div className="ad-dialog-footer">
          <Button type="button" variant="ghost" onClick={close}>
            Close
          </Button>
        </div>
      </dialog>
    </>
  )
}