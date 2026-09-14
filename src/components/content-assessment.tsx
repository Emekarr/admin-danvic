'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch, apiUrl, type ContentReview, type ContentVersion, type PaginatedResult, type ReviewCriterion, type ReviewableContent } from '@danvic/api-client'
import { Badge, Button, CustomDropdown, Field, FormMessage, Input, PageHeader } from '@danvic/ui'

type Overview = {
  content: { total: number; pendingReview: number; approved: number; rejected: number; published: number; archived: number }
  recentContent: ReviewableContent[]
  assessments?: { total?: number; pendingReview?: number; approved?: number; rejected?: number }
  assessmentBreakdown?: Record<string, number>
  recentTutorActivity?: Array<{ tutor?: string; status?: string; lastActive?: string }>
}

type AssessmentKind = 'assignment' | 'quiz' | 'exam' | 'question'

type Detail = {
  content: ReviewableContent
  versions: ContentVersion[]
  reviews: ContentReview[]
  currentPayload?: unknown
  reviewSchedule?: { reviewAt: string; reviewer?: { firstName: string; lastName: string }; status: string } | null
  capabilities?: Record<string, boolean>
}

const criterionLabels: Record<ReviewCriterion, string> = {
  technical_accuracy: 'Technical accuracy',
  brand_consistency: 'Brand consistency',
  copyright_ip: 'Copyright / IP',
  safety_regulatory: 'Safety & regulatory',
  content_quality: 'Content quality',
}

const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-NG') : '—'
const person = (value: { firstName: string; lastName: string }) => `${value.firstName} ${value.lastName}`
const displayStatus = (item: Pick<ReviewableContent, 'reviewStatus' | 'publicationStatus'>) =>
  item.publicationStatus === 'archived' ? 'Archived' : item.publicationStatus === 'published' ? 'Published' : item.reviewStatus === 'approved' ? 'Approved' : item.reviewStatus === 'needs_revision' ? 'Needs revision' : item.reviewStatus === 'pending_review' ? 'Pending review' : item.reviewStatus === 'rejected' ? 'Rejected' : 'Draft'
const statusTone = (status: string) => status === 'Published' || status === 'Approved' ? 'green' : status === 'Rejected' ? 'red' : status === 'Needs revision' ? 'amber' : status === 'Pending review' ? 'violet' : 'blue'

function ErrorState({ error }: { error: unknown }) {
  const code = (error as { code?: string })?.code
  const message = error instanceof Error ? error.message : 'Could not load this workspace.'
  return <p className="ad-empty-line" data-tone="error">{code === 'FORBIDDEN' ? 'You do not have permission to access this workspace.' : message}</p>
}

function ExportButton({ path }: { path: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <span>
    <Button variant="secondary" busy={busy} onClick={async () => {
      setBusy(true); setError('')
      try {
        const response = await fetch(apiUrl(path), { credentials: 'include' })
        if (!response.ok) throw new Error('The export could not be downloaded.')
        const blob = await response.blob()
        const disposition = response.headers.get('content-disposition') ?? ''
        const filename = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1] ?? 'danvic-export.csv'
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url)
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Export failed') } finally { setBusy(false) }
    }}>Export</Button>{error ? <small className="ad-inline-error">{error}</small> : null}
  </span>
}

function StatCards({ entries }: { entries: Array<{ label: string; value: number | string; href?: string }> }) {
  return <div className="ad-directory-grid">{entries.map((entry) => entry.href ? <Link className="ad-directory-card" href={entry.href} key={entry.label}><span className="ad-directory-card-label">{entry.label}</span><strong>{entry.value}</strong></Link> : <div className="ad-directory-card" key={entry.label}><span className="ad-directory-card-label">{entry.label}</span><strong>{entry.value}</strong></div>)}</div>
}

export function ContentAssessmentOverview() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => { void apiFetch<Overview>('/api/content-assessment/overview').then(setData).catch(setError) }, [])
  if (error) return <ErrorState error={error} />
  if (!data) return <p className="ad-empty-line">Loading content assessment overview…</p>
  const assessment = data.assessments ?? {}
  return <div className="ad-directory-page">
    <PageHeader title="Content Assessment" description="Assess, approve, publish and retain the learning content that powers DANVIC." />
    <section className="ad-section ad-section--plain"><StatCards entries={[
      { label: 'Total content', value: data.content.total, href: '/content-assessment/content' },
      { label: 'Pending review', value: data.content.pendingReview, href: '/content-assessment/content/pending' },
      { label: 'Approved', value: data.content.approved, href: '/content-assessment/content/approved' },
      { label: 'Rejected', value: data.content.rejected, href: '/content-assessment/content/rejected' },
    ]} /></section>
    <section className="ad-section"><div className="ad-section-heading"><div><h2>Governance tools</h2><p>Open detailed workspaces only when you need them.</p></div></div><div className="ad-policy-actions"><Link className="sb-button sb-button--secondary" href="/content-assessment/reviews">Content review</Link><Link className="sb-button sb-button--secondary" href="/content-assessment/versions/history">Version control</Link><Link className="sb-button sb-button--secondary" href="/content-assessment/tutors/overview">Tutors</Link><Link className="sb-button sb-button--secondary" href="/content-assessment/review-dates">Review dates</Link></div></section>
    <section className="ad-section"><div className="ad-section-heading"><div><h2>Assessment</h2><p>Review queue and lifecycle totals.</p></div><Link className="ad-text-link" href="/content-assessment/assessments">View assessments</Link></div><StatCards entries={[
      { label: 'Total assessment', value: assessment.total ?? 0 }, { label: 'Pending review', value: assessment.pendingReview ?? 0 }, { label: 'Approved', value: assessment.approved ?? 0 }, { label: 'Rejected', value: assessment.rejected ?? 0 },
    ]} /></section>
    <section className="ad-section"><div className="ad-section-heading"><div><h2>Assessment breakdown</h2><p>Assignment, quiz, exam and question-bank inventory.</p></div></div><StatCards entries={['assignment', 'quiz', 'exam', 'question'].map((kind) => ({ label: kind === 'question' ? 'Question bank' : `${kind[0]?.toUpperCase() ?? ''}${kind.slice(1)}s`, value: data.assessmentBreakdown?.[kind] ?? 0, href: kind === 'question' ? '/content-assessment/question-bank' : `/content-assessment/assessments/${kind}s` }))} /></section>
    <section className="ad-section"><div className="ad-section-heading"><div><h2>Recent content</h2><p>Latest tutor submissions and decisions.</p></div><Link className="ad-text-link" href="/content-assessment/content">View all content</Link></div><ContentTable items={data.recentContent ?? []} empty="No recent content." /></section>
    <section className="ad-section"><div className="ad-section-heading"><div><h2>Recent tutor activity</h2><p>Latest activity returned by the assessment service.</p></div></div>{data.recentTutorActivity?.length ? <div className="ad-activity-list">{data.recentTutorActivity.map((item, index) => <div className="ad-activity-row" key={`${item.tutor}-${index}`}><strong>{item.tutor ?? 'Tutor'}</strong><span>{item.status ?? 'Updated'} · {date(item.lastActive)}</span></div>)}</div> : <p className="ad-empty-line">No recent tutor activity.</p>}</section>
  </div>
}

export function AssessmentOverview() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  useEffect(() => { void apiFetch<Overview>('/api/content-assessment/overview').then(setData).catch(setError) }, [])
  const inventoryPath = useMemo(() => {
    const params = new URLSearchParams({ page: '1', limit: '50' })
    if (search) params.set('search', search)
    if (type) params.set('kind', type)
    if (status) params.set('status', status)
    return `/api/content-assessment/assessments?${params}`
  }, [search, status, type])
  const inventory = usePaginated(inventoryPath)
  if (error) return <ErrorState error={error} />
  if (!data) return <p className="ad-empty-line">Loading assessment overview…</p>
  const assessment = data.assessments ?? {}
  return <div className="ad-directory-page">
    <PageHeader title="Assessment overview" description="Monitor assignments, quizzes, exams and questions across every course." />
    <section className="ad-section ad-section--plain"><StatCards entries={[
      { label: 'Total assessments', value: assessment.total ?? 0 },
      { label: 'Pending review', value: assessment.pendingReview ?? 0 },
      { label: 'Approved', value: assessment.approved ?? 0 },
      { label: 'Rejected', value: assessment.rejected ?? 0 },
    ]} /></section>
    <section className="ad-section"><div className="ad-section-heading"><div><h2>Assessment inventory</h2><p>Use filters to switch between assignments, quizzes, exams and every review state.</p></div><ExportButton path={`${inventoryPath}&format=csv`} /></div><div className="ad-list-controls"><Input aria-label="Search assessments" placeholder="Search assessment or tutor" value={search} onChange={(event) => setSearch(event.target.value)} /><FilterDropdown label="Type" value={type} onChange={setType} options={[{ value: '', label: 'All assessment types' }, { value: 'assignment', label: 'Assignments' }, { value: 'quiz', label: 'Quizzes' }, { value: 'exam', label: 'Exams' }, { value: 'question', label: 'Questions' }]} id="assessment-overview-type" /><FilterDropdown label="Review status" value={status} onChange={setStatus} options={[{ value: '', label: 'All statuses' }, { value: 'pending_review', label: 'Pending review' }, { value: 'approved', label: 'Approved' }, { value: 'needs_revision', label: 'Needs revision' }, { value: 'rejected', label: 'Rejected' }, { value: 'published', label: 'Published' }, { value: 'archived', label: 'Archived' }]} id="assessment-overview-status" /></div>{inventory.error ? <ErrorState error={inventory.error} /> : inventory.result ? <ContentTable items={inventory.result.items} empty="No assessment content matches these filters." /> : <p className="ad-empty-line">Loading assessment inventory…</p>}</section>
  </div>
}

function ContentTable({ items, empty, criterion }: { items: ReviewableContent[]; empty: string; criterion?: ReviewCriterion }) {
  if (!items.length) return <p className="ad-empty-line">{empty}</p>
  return <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Tutor</th><th>Content</th><th>Type</th><th>Status</th><th>{criterion ? `${criterionLabels[criterion]} score` : 'Date'}</th></tr></thead><tbody>{items.map((item) => { const status = displayStatus(item); return <tr key={item.id}><td>{person(item.author)}</td><td><Link className="ad-table-link" href={`/content-assessment/content/${encodeURIComponent(item.id)}`}>{item.title}</Link></td><td>{item.type}</td><td><Badge dot tone={statusTone(status)}>{status}</Badge></td><td>{criterion ? item.reviewScores?.[criterion] ?? '—' : date(item.updatedAt)}</td></tr> })}</tbody></table></div>
}

function usePaginated(path: string) {
  const [result, setResult] = useState<PaginatedResult<ReviewableContent> | null>(null)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => { void apiFetch<PaginatedResult<ReviewableContent>>(path).then(setResult).catch(setError) }, [path])
  return { result, error }
}

function FilterDropdown({ label, value, onChange, options, id }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; id: string }) {
  return <label className="ad-filter-control"><span>{label}</span><CustomDropdown value={value} onChange={onChange} options={options} id={id} /></label>
}

const assessmentKindForBucket = (bucket: string): AssessmentKind | null =>
  bucket === 'assignments' ? 'assignment' : bucket === 'quizzes' ? 'quiz' : bucket === 'exams' ? 'exam' : null

export function ContentAssessmentList({ kind, bucket = 'all' }: { kind: 'content' | 'assessment' | 'versions'; bucket?: string }) {
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [reviewStatus, setReviewStatus] = useState('')
  const [page, setPage] = useState(1)
  const contentId = kind === 'versions' ? searchParams.get('contentId') ?? '' : ''
  const path = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '25' })
    if (search) params.set('search', search)
    if (type) params.set('type', type)
    if (authorId) params.set('authorId', authorId)
    if (reviewStatus) params.set('status', reviewStatus)
    if (contentId) params.set('contentId', contentId)
    if (kind === 'content') return `/api/content-assessment/content?bucket=${encodeURIComponent(bucket)}&${params}`
    if (kind === 'assessment') {
      if (bucket === 'question-bank') return `/api/content-assessment/question-bank?${params}`
      if (bucket === 'pending') return `/api/content-assessment/assessments?bucket=pending&${params}`
      const assessmentKind = assessmentKindForBucket(bucket)
      if (assessmentKind) params.set('kind', assessmentKind)
      return `/api/content-assessment/assessments?${params}`
    }
    return `/api/content-assessment/versions?bucket=${bucket === 'drafts' ? 'draft' : bucket === 'controlled-updates' ? 'controlled_update' : bucket}&${params}`
  }, [authorId, bucket, contentId, kind, page, reviewStatus, search, type])
  const { result, error } = usePaginated(path)
  const heading = kind === 'content' ? `${bucket === 'all' ? 'All' : bucket.replace(/-/g, ' ')} content` : kind === 'versions' ? `${bucket.replace(/-/g, ' ')} versions` : bucket === 'question-bank' ? 'Question bank' : `${bucket.replace(/-/g, ' ')} assessments`
  const contentItems = result?.items.map((item) => bucket === 'question-bank' ? ((item as unknown as { governance?: ReviewableContent }).governance ?? item) : item) ?? []
  return <div className="ad-directory-page"><PageHeader title={heading} description={contentId ? 'Immutable version history for the selected content record.' : 'Search, filter, export and open the full assessment record.'} actions={<><ExportButton path={`${path}&format=csv`} />{kind === 'content' && bucket === 'all' ? <Link className="sb-button sb-button--secondary" href="/content-assessment">More tools</Link> : null}</>} /><section className="ad-section ad-section--plain"><div className="ad-list-controls"><Input aria-label="Search" placeholder="Search title or tutor" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} /><FilterDropdown label="Type" value={type} onChange={(value) => { setType(value); setPage(1) }} options={[{ value: '', label: 'All types' }, { value: 'lesson', label: 'Lesson' }, { value: 'video', label: 'Video' }, { value: 'document', label: 'Document' }, { value: 'assignment', label: 'Assignment' }, { value: 'quiz', label: 'Quiz' }, { value: 'exam', label: 'Exam' }, { value: 'question', label: 'Question' }]} id="content-type-filter" /><FilterDropdown label="Tutor" value={authorId} onChange={(value) => { setAuthorId(value); setPage(1) }} options={[{ value: '', label: 'All tutors' }, ...(result?.filters.authors ?? []).map((author) => ({ value: author.id, label: `${author.firstName} ${author.lastName}` }))]} id="content-tutor-filter" /><FilterDropdown label="Status" value={reviewStatus} onChange={(value) => { setReviewStatus(value); setPage(1) }} options={[{ value: '', label: 'All statuses' }, ...(result?.filters.statuses ?? []).map((value) => ({ value, label: value.replace(/_/g, ' ') }))]} id="content-status-filter" /></div>{error ? <ErrorState error={error} /> : result ? kind === 'versions' ? <VersionTable items={result.items as unknown as ContentVersion[]} /> : <ContentTable items={contentItems} empty="No content matches these filters." /> : <p className="ad-empty-line">Loading records…</p>}{result?.page ? <div className="ad-table-pagination"><p className="ad-table-meta">Page {result.page.number} of {result.page.totalPages} · {result.page.total} records</p><div><Button variant="ghost" disabled={result.page.number <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="ghost" disabled={result.page.number >= result.page.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div> : null}</section></div>
}
function VersionTable({ items }: { items: ContentVersion[] }) {
  if (!items.length) return <p className="ad-empty-line">No versions match these filters.</p>
  return <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Version</th><th>State</th><th>Created by</th><th>Created</th><th>Published</th><th>Changes</th></tr></thead><tbody>{items.map((version) => { const state = version.state.replace(/_/g, ' '); const label = state[0]?.toUpperCase() + state.slice(1); return <tr key={version.id}><td>{version.label || `v${version.number}`}</td><td><Badge dot tone={version.state === 'published' ? 'green' : version.state === 'draft' ? 'blue' : version.state === 'superseded' ? 'red' : 'violet'}>{label}</Badge></td><td>{person(version.createdBy)}</td><td>{date(version.createdAt)}</td><td>{date(version.publishedAt)}</td><td>{version.changeSummary ?? '—'}</td></tr> })}</tbody></table></div>
}

export function ContentAssessmentDetail({ contentId }: { contentId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  useEffect(() => { void apiFetch<Detail>(`/api/content-assessment/content/${encodeURIComponent(contentId)}`).then(setDetail).catch(setError) }, [contentId])
  if (error) return <ErrorState error={error} />
  if (!detail) return <p className="ad-empty-line">Loading content detail…</p>
  const { content } = detail
  const refresh = () => { void apiFetch<Detail>(`/api/content-assessment/content/${encodeURIComponent(contentId)}`).then(setDetail).catch(setError) }
  return <div className="ad-directory-page"><Link className="ad-course-back" href="/content-assessment/content">Back to content</Link><PageHeader title={content.title} description={`${person(content.author)} · ${content.type} · ${content.courseName ?? 'No course'}`} actions={<Badge dot tone={statusTone(displayStatus(content))}>{displayStatus(content)}</Badge>} /><section className="ad-section ad-section--plain"><div className="ad-detail-grid"><div><span className="ad-directory-card-label">Review status</span><strong>{displayStatus(content)}</strong></div><div><span className="ad-directory-card-label">Current version</span><strong>{content.currentVersion?.label || (content.currentVersion ? `v${content.currentVersion.number}` : 'No version')}</strong></div><div><span className="ad-directory-card-label">Submitted</span><strong>{date(content.submittedAt)}</strong></div><div><span className="ad-directory-card-label">Next review</span><strong>{date(content.nextReviewAt)}</strong></div></div>{content.rejectionReason ? <p className="ad-form-callout" data-tone="error">{content.rejectionReason}</p> : null}<ContentLifecycleActions detail={detail} onDone={(text) => { setMessage(text); refresh() }} /><ScheduleReviewForm contentId={contentId} onDone={(text) => { setMessage(text); refresh() }} /></section><ReviewDecisionForm key={detail.reviews[0]?.id ?? detail.content.currentVersion?.id ?? 'new'} detail={detail} onComplete={(text) => { setMessage(text); refresh() }} /><section className="ad-section"><div className="ad-section-heading"><div><h2>Version history</h2><p>Immutable history returned by the backend.</p></div><Link className="ad-text-link" href={`/content-assessment/versions/history?contentId=${encodeURIComponent(contentId)}`}>Open history</Link></div><VersionHistory versions={detail.versions} /></section><section className="ad-section"><div className="ad-section-heading"><div><h2>Prior reviews</h2><p>Decisions and criterion feedback.</p></div></div>{detail.reviews.length ? detail.reviews.map((review) => <article className="ad-review-record" key={review.id}><div><Badge>{review.decision.replace(/_/g, ' ')}</Badge><span>{person(review.reviewer)} · {date(review.createdAt)}</span></div><p>{review.summary}</p><ul>{review.criteria.map((item) => <li key={item.criterion}><strong>{criterionLabels[item.criterion]}</strong>: {item.score ?? '—'} · {item.comment ?? 'No comment'}</li>)}</ul></article>) : <p className="ad-empty-line">No reviews yet.</p>}</section>{detail.currentPayload ? <details className="ad-section"><summary>Current payload</summary><pre className="ad-code-block">{JSON.stringify(detail.currentPayload, null, 2)}</pre></details> : null}<FormMessage tone="success">{message}</FormMessage></div>
}

function ScheduleReviewForm({ contentId, onDone }: { contentId: string; onDone: (message: string) => void }) {
  const [reviewAt, setReviewAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <div className="ad-schedule-form"><label>Schedule next review <Input type="datetime-local" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} /></label><Button variant="secondary" busy={busy} disabled={!reviewAt} onClick={async () => { setBusy(true); setError(''); try { await apiFetch(`/api/content-assessment/content/${encodeURIComponent(contentId)}/schedule-review`, { method: 'POST', body: JSON.stringify({ reviewAt: new Date(reviewAt).toISOString() }) }); onDone('Review date scheduled.') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not schedule review.') } finally { setBusy(false) } }}>Schedule review</Button><FormMessage>{error}</FormMessage></div>
}

function ContentLifecycleActions({ detail, onDone }: { detail: Detail; onDone: (message: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const content = detail.content
  const run = async (action: 'publish' | 'archive') => {
    setBusy(true); setError('')
    try {
      await apiFetch(`/api/content-assessment/content/${encodeURIComponent(content.id)}/${action}`, { method: 'POST', body: JSON.stringify(action === 'publish' ? { versionId: content.currentVersion?.id } : { reason: window.prompt('Archive reason (optional)') ?? undefined }) })
      onDone(action === 'publish' ? 'Content published.' : 'Content archived.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : `Could not ${action} content.`) } finally { setBusy(false) }
  }
  return <div className="ad-policy-actions">{content.reviewStatus === 'approved' && content.publicationStatus === 'unpublished' && content.currentVersion && detail.capabilities?.publish !== false ? <Button busy={busy} onClick={() => void run('publish')}>Publish approved version</Button> : null}{content.publicationStatus !== 'archived' && detail.capabilities?.archive !== false ? <Button variant="secondary" busy={busy} onClick={() => void run('archive')}>Archive</Button> : null}<FormMessage>{error}</FormMessage></div>
}

function ReviewDecisionForm({ detail, onComplete }: { detail: Detail; onComplete: (message: string) => void }) {
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'needs_revision'>('approved')
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [criteria, setCriteria] = useState<Record<ReviewCriterion, { checked: boolean; comment: string }>>(() => {
    const latest = detail.reviews[0]
    return Object.fromEntries(Object.keys(criterionLabels).map((criterion) => {
      const saved = latest?.criteria.find((item) => item.criterion === criterion)
      return [criterion, { checked: saved?.score != null, comment: saved?.comment ?? '' }]
    })) as Record<ReviewCriterion, { checked: boolean; comment: string }>
  })
  const submit = async () => {
    if ((decision === 'rejected' || decision === 'needs_revision') && !summary.trim()) { setError('A summary is required for rejected and needs-revision decisions.'); return }
    setBusy(true); setError('')
    try {
      await apiFetch(`/api/content-assessment/content/${encodeURIComponent(detail.content.id)}/reviews`, { method: 'POST', body: JSON.stringify({ versionId: detail.content.currentVersion?.id, decision, summary, criteria: Object.fromEntries(Object.entries(criteria).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), { score: value.checked ? 100 : null, comment: value.comment || null }])), nextReviewAt: null }) })
      onComplete('Review decision submitted.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The decision could not be submitted.') } finally { setBusy(false) }
  }
  const canReview = detail.capabilities?.review !== false && detail.content.currentVersion != null && detail.content.reviewStatus !== 'approved' && detail.content.publicationStatus !== 'published'
  return <section className="ad-section"><div className="ad-section-heading"><div><h2>Assess this version</h2><p>Decisions are immutable in review history; check each course quality criterion you reviewed.</p></div></div>{canReview ? <div className="ad-review-form"><label className="ad-review-decision"><span>Decision</span><CustomDropdown value={decision} onChange={(value) => setDecision(value as typeof decision)} options={[{ value: 'approved', label: 'Approved' }, { value: 'needs_revision', label: 'Needs revision' }, { value: 'rejected', label: 'Rejected' }]} id="review-decision" /></label><Field label="Summary" hint="Required for rejected and needs-revision decisions."><textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={3} /></Field><div className="ad-criteria-grid">{(Object.keys(criterionLabels) as ReviewCriterion[]).map((criterion) => <div className="ad-criterion-field" key={criterion}><label className="ad-checkbox-field"><input type="checkbox" checked={criteria[criterion].checked} onChange={(event) => setCriteria((current) => ({ ...current, [criterion]: { ...current[criterion], checked: event.target.checked } }))} /><span><strong>{criterionLabels[criterion]}</strong><small>Reviewed</small></span></label><textarea placeholder="Optional comment" rows={2} value={criteria[criterion].comment} onChange={(event) => setCriteria((current) => ({ ...current, [criterion]: { ...current[criterion], comment: event.target.value } }))} /></div>)}</div><Button busy={busy} onClick={() => void submit()}>Submit decision</Button><FormMessage>{error}</FormMessage></div> : <p className="ad-empty-line">This version cannot be reviewed from its current state.</p>}</section>
}

function VersionHistory({ versions }: { versions: ContentVersion[] }) {
  return versions.length ? <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Version</th><th>State</th><th>Created by</th><th>Date</th><th>Changes</th></tr></thead><tbody>{versions.map((version) => <tr key={version.id}><td>{version.label || `v${version.number}`}</td><td>{version.state}</td><td>{person(version.createdBy)}</td><td>{date(version.updatedAt)}</td><td>{version.changeSummary ?? '—'}</td></tr>)}</tbody></table></div> : <p className="ad-empty-line">No version history.</p>
}

type TutorRow = Record<string, unknown> & { author?: Record<string, unknown> }

const tutorName = (row: TutorRow) => {
  const author = row.author ?? row
  const fullName = `${String(author.firstName ?? '')} ${String(author.lastName ?? '')}`.trim()
  const label = author.name ?? (fullName || author.email || 'Tutor')
  return String(label)
}

const tutorId = (row: TutorRow) => String(row.id ?? row.author?.id ?? '')
const tutorCount = (row: TutorRow, key: string) => String(row[key] ?? 0)

const tutorSegmentLabel = (segment: string) => ({
  all: 'All Tutors',
  pending: 'Tutors with Pending Content',
  approved: 'Tutors with Approved Content',
  rejected: 'Tutors with Rejected Content',
  needs_revision: 'Tutors with Content Requiring Updates',
}[segment] ?? 'Tutors')

function TutorRows({ rows }: { rows: TutorRow[] }) {
  if (!rows.length) return <p className="ad-empty-line">No tutors in this segment.</p>
  return <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Tutor</th><th>Courses</th><th>Content</th><th>Pending</th><th>Approved</th><th>Rejected</th><th>Requires updates</th><th>Last active</th></tr></thead><tbody>{rows.map((row, index) => { const id = tutorId(row); return <tr key={id || index}><td>{id ? <Link className="ad-table-link" href={`/content-assessment/tutors/${encodeURIComponent(id)}`}>{tutorName(row)}</Link> : tutorName(row)}</td><td>{tutorCount(row, 'courseCount')}</td><td>{tutorCount(row, 'contentCount')}</td><td>{tutorCount(row, 'pendingCount')}</td><td>{tutorCount(row, 'approvedCount')}</td><td>{tutorCount(row, 'rejectedCount')}</td><td>{tutorCount(row, 'needsRevisionCount')}</td><td>{date(typeof row.lastActive === 'string' ? row.lastActive : null)}</td></tr> })}</tbody></table></div>
}

export function TutorAssessmentList({ segment = 'all' }: { segment?: string }) {
  const [data, setData] = useState<{ items?: TutorRow[] } | null>(null)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => { void apiFetch<{ items?: TutorRow[] }>(`/api/content-assessment/tutors?segment=${encodeURIComponent(segment)}&page=1&limit=25`).then(setData).catch(setError) }, [segment])
  if (error) return <ErrorState error={error} />
  if (!data) return <p className="ad-empty-line">Loading tutors…</p>
  const rows = data.items ?? []
  return <div className="ad-directory-page"><PageHeader title={tutorSegmentLabel(segment)} description="Tutor outcomes and content review activity." actions={<ExportButton path={`/api/content-assessment/tutors?segment=${encodeURIComponent(segment)}&format=csv`} />} /><section className="ad-section ad-section--plain"><TutorRows rows={rows} /></section></div>
}

export function TutorAssessmentOverview() {
  const [data, setData] = useState<{ items?: TutorRow[] } | null>(null)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => { void apiFetch<{ items?: TutorRow[] }>('/api/content-assessment/tutors?segment=all&page=1&limit=500').then(setData).catch(setError) }, [])
  if (error) return <ErrorState error={error} />
  if (!data) return <p className="ad-empty-line">Loading tutor overview…</p>
  const rows = data.items ?? []
  const total = (key: string) => rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0)
  return <div className="ad-directory-page"><PageHeader title="Tutor overview" description="See tutor activity and content outcomes at a glance." /><section className="ad-section ad-section--plain"><StatCards entries={[{ label: 'All tutors', value: rows.length, href: '/content-assessment/tutors' }, { label: 'Tutors with pending content', value: rows.filter((row) => Number(row.pendingCount ?? 0) > 0).length, href: '/content-assessment/tutors/pending' }, { label: 'Total content', value: total('contentCount') }, { label: 'Approved content', value: total('approvedCount') }, { label: 'Rejected content', value: total('rejectedCount') }, { label: 'Content requiring updates', value: total('needsRevisionCount'), href: '/content-assessment/tutors/requires-updates' }]} /></section><section className="ad-section"><div className="ad-section-heading"><div><h2>All tutor activity</h2><p>Review the content outcomes for every tutor.</p></div><Link className="ad-text-link" href="/content-assessment/tutors">View all tutors</Link></div><TutorRows rows={rows} /></section></div>
}

export function TutorDetail({ authorId }: { authorId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => { void apiFetch<Record<string, unknown>>(`/api/content-assessment/tutors/${encodeURIComponent(authorId)}`).then(setData).catch(setError) }, [authorId])
  if (error) return <ErrorState error={error} />
  if (!data) return <p className="ad-empty-line">Loading tutor detail…</p>
  const profile = (data.profile ?? data.author ?? data) as Record<string, unknown>
  const summary = (data.summary ?? {}) as Record<string, unknown>
  const totals = (data.contentTotals ?? data.totals ?? summary) as Record<string, unknown>
  const name = String(profile.name ?? (`${String(profile.firstName ?? '')} ${String(profile.lastName ?? '')}`.trim() || 'Tutor'))
  const content = Array.isArray(data.content) ? data.content as ReviewableContent[] : []
  return <div className="ad-directory-page"><Link className="ad-course-back" href="/content-assessment/tutors">Back to tutors</Link><PageHeader title={name} description={String(profile.email ?? profile.role ?? 'Tutor profile')} /><section className="ad-section ad-section--plain"><StatCards entries={[{ label: 'Total content', value: String(totals.total ?? totals.contentCount ?? data.totalContent ?? 0) }, { label: 'Approved', value: String(totals.approved ?? totals.approvedCount ?? data.approvedContent ?? 0) }, { label: 'Pending', value: String(totals.pending ?? totals.pendingCount ?? data.pendingContent ?? 0) }, { label: 'Rejected', value: String(totals.rejected ?? totals.rejectedCount ?? data.rejectedContent ?? 0) }, { label: 'Needs revision', value: String(totals.needsRevision ?? totals.needsRevisionCount ?? data.needsRevision ?? 0) }]} /></section><section className="ad-section"><h2>Courses and latest activity</h2><p>{Array.isArray(data.courses) ? `${data.courses.length} course${data.courses.length === 1 ? '' : 's'}` : 'Course data'} · Last active {date(typeof (data.lastActive ?? summary.lastActive) === 'string' ? (data.lastActive ?? summary.lastActive) as string : null)}</p></section><section className="ad-section"><div className="ad-section-heading"><div><h2>Content assessment record</h2><p>Open an item to review its version, feedback and publication history.</p></div></div><ContentTable items={content} empty="This tutor has not submitted content yet." /></section></div>
}

export function ReviewDatesPage() {
  const [data, setData] = useState<{ events?: Array<{ id: string; contentId: string; reviewAt: string; reviewer?: { firstName: string; lastName: string }; status: string }>; items?: Array<{ id: string; contentId: string; reviewAt: string; reviewer?: { firstName: string; lastName: string }; status: string }> } | null>(null)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => { void apiFetch<typeof data>('/api/content-assessment/review-dates').then(setData).catch(setError) }, [])
  if (error) return <ErrorState error={error} />
  if (!data) return <p className="ad-empty-line">Loading review dates…</p>
  const rows = data.events ?? data.items ?? []
  return <div className="ad-directory-page"><PageHeader title="Review dates" description="Scheduled content reviews and their current status." /><section className="ad-section ad-section--plain"><div className="ad-calendar-strip">{rows.slice(0, 7).map((row) => <div key={row.id}><strong>{date(row.reviewAt)}</strong><span>{row.status}</span></div>)}</div><div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Content</th><th>Review date</th><th>Reviewer</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><Link href={`/content-assessment/content/${encodeURIComponent(row.contentId)}`}>{row.contentId}</Link></td><td>{date(row.reviewAt)}</td><td>{row.reviewer ? person(row.reviewer) : '—'}</td><td>{row.status}</td></tr>)}</tbody></table></div></section></div>
}

const reviewCriterionForSlug: Record<string, ReviewCriterion> = {
  'technical-accuracy': 'technical_accuracy',
  'brand-consistency': 'brand_consistency',
  'copyright-ip': 'copyright_ip',
  'safety-regulatory': 'safety_regulatory',
  'content-quality': 'content_quality',
}

type ReviewHistoryRow = ContentReview & { content?: ReviewableContent | null }

export function ContentReviewHub() {
  return <div className="ad-directory-page"><PageHeader title="Content review" description="Choose the quality lens for the review queue or open the audit trail." /><section className="ad-section ad-section--plain"><div className="ad-policy-actions">{Object.entries(reviewCriterionForSlug).map(([slug, criterion]) => <Link className="sb-button sb-button--secondary" href={`/content-assessment/reviews/${slug}`} key={slug}>{criterionLabels[criterion]}</Link>)}<Link className="sb-button sb-button--secondary" href="/content-assessment/reviews/history">Review history</Link></div></section></div>
}

export function ContentReviewPage({ section }: { section: string }) {
  const history = section === 'history'
  const criterion = reviewCriterionForSlug[section]
  const [search, setSearch] = useState('')
  const [data, setData] = useState<PaginatedResult<ReviewableContent | ReviewHistoryRow> | null>(null)
  const [error, setError] = useState<unknown>(null)
  const path = useMemo(() => {
    const params = new URLSearchParams({ page: '1', limit: '50' })
    if (search) params.set('search', search)
    if (criterion) params.set('criterion', criterion)
    return `/api/content-assessment/reviews${history ? '/history' : ''}?${params}`
  }, [criterion, history, search])
  useEffect(() => { void apiFetch<PaginatedResult<ReviewableContent | ReviewHistoryRow>>(path).then(setData).catch(setError) }, [path])
  if (error) return <ErrorState error={error} />
  const criterionLabel = criterion ? criterionLabels[criterion] : 'Content'
  const title = history ? 'Review history' : `${criterionLabel} review`
  const items = data?.items ?? []
  return <div className="ad-directory-page"><PageHeader title={title} description={history ? 'A complete, auditable record of review decisions, feedback and changes.' : `Assess ${criterionLabel.toLocaleLowerCase()} across submitted tutor content.`} /><section className="ad-section ad-section--plain"><div className="ad-list-controls"><Input aria-label="Search reviews" placeholder="Search content or tutor" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{!data ? <p className="ad-empty-line">Loading review records…</p> : history ? <ReviewHistoryTable items={items as ReviewHistoryRow[]} /> : criterion ? <ContentTable items={items as ReviewableContent[]} criterion={criterion} empty="No content matches this review queue." /> : <p className="ad-empty-line">Choose a review criterion.</p>}</section></div>
}

function ReviewHistoryTable({ items }: { items: ReviewHistoryRow[] }) {
  if (!items.length) return <p className="ad-empty-line">No review history yet.</p>
  return <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Content</th><th>Decision</th><th>Reviewer</th><th>Date</th><th>Summary</th></tr></thead><tbody>{items.map((review) => { const decision = review.decision.replace(/_/g, ' '); return <tr key={review.id}><td>{review.content ? <Link className="ad-table-link" href={`/content-assessment/content/${encodeURIComponent(review.content.id)}`}>{review.content.title}</Link> : 'Deleted content'}</td><td><Badge dot tone={statusTone(decision === 'needs revision' ? 'Needs revision' : `${decision.charAt(0).toUpperCase()}${decision.slice(1)}`)}>{decision}</Badge></td><td>{person(review.reviewer)}</td><td>{date(review.createdAt)}</td><td>{review.summary || '—'}</td></tr> })}</tbody></table></div>
}

export function ContentAssessmentRoute({ slug }: { slug: string[] }) {
  if (!slug.length) return <ContentAssessmentOverview />
  if (slug[0] === 'content') {
    if (!slug[1]) return <ContentAssessmentList kind="content" bucket="all" />
    if (['pending', 'approved', 'rejected', 'published', 'archived'].includes(slug[1])) return <ContentAssessmentList kind="content" bucket={slug[1]} />
    return <ContentAssessmentDetail contentId={slug[1]} />
  }
  if (slug[0] === 'assessments') return !slug[1] || slug[1] === 'all' ? <AssessmentOverview /> : <ContentAssessmentList kind="assessment" bucket={slug[1]} />
  if (slug[0] === 'question-bank') return <ContentAssessmentList kind="assessment" bucket="question-bank" />
  if (slug[0] === 'versions') return <ContentAssessmentList kind="versions" bucket={slug[1] ?? 'published'} />
  if (slug[0] === 'reviews' && !slug[1]) return <ContentReviewHub />
  if (slug[0] === 'reviews' && slug[1] && (slug[1] === 'history' || slug[1] in reviewCriterionForSlug)) return <ContentReviewPage section={slug[1]} />
  if (slug[0] === 'review-dates') return <ReviewDatesPage />
  if (slug[0] === 'tutors') {
    if (slug[1] === 'overview') return <TutorAssessmentOverview />
    if (slug[1] && ['pending', 'approved', 'rejected', 'requires-updates'].includes(slug[1])) return <TutorAssessmentList segment={slug[1] === 'requires-updates' ? 'needs_revision' : slug[1]} />
    return slug[1] ? <TutorDetail authorId={slug[1]} /> : <TutorAssessmentList />
  }
  return <ErrorState error={new Error('This assessment page does not exist.')} />
}
