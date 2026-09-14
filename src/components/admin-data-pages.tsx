'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  apiFetch,
  type AdminAuthorDetail,
  type AdminCourseDetail,
  type AdminCourseEntry,
  type AdminDirectoryEntry,
  type AdminProfile,
  type AdminStudentDetail,
  type AuthorDirectoryEntry,
  type ContentReview,
  type ContentVersion,
  type StudentDirectoryEntry,
} from '@danvic/api-client'
import { Badge, PageHeader } from '@danvic/ui'
import { DirectorySearch } from './directory-search'
import { InviteDialog } from './invite-dialog'
import { InviteHistory } from './invite-history'
import { SecurityForm } from './security-form'
import { MfaPolicyPanel } from './security-policy'

type DirectoryKind = 'author' | 'student' | 'admin' | 'course'

const endpointByKind: Record<DirectoryKind, string> = {
  author: '/api/authors',
  student: '/api/students',
  admin: '/api/admins',
  course: '/api/courses',
}

const labelByKind: Record<DirectoryKind, string> = {
  author: 'Authors',
  student: 'Students',
  admin: 'Admins',
  course: 'Courses',
}

type DirectoryItem = AdminDirectoryEntry | AuthorDirectoryEntry | StudentDirectoryEntry | AdminCourseEntry

const date = (value: string) => new Date(value).toLocaleDateString('en-NG')
const nameOf = (item: AdminDirectoryEntry | AuthorDirectoryEntry | StudentDirectoryEntry) =>
  `${item.firstName} ${item.lastName}`

function DataState({ error, loading }: { error: string; loading: boolean }) {
  if (loading) return <p className="ad-empty-line">Loading data…</p>
  if (error) return <p className="ad-empty-line">{error}</p>
  return null
}

export function AdminDirectory({ kind }: { kind: DirectoryKind }) {
  const [items, setItems] = useState<DirectoryItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const label = labelByKind[kind]

  useEffect(() => {
    let active = true
    const key = `${kind}s` as 'admins' | 'authors' | 'students' | 'courses'
    void apiFetch<Record<typeof key, DirectoryItem[]>>(endpointByKind[kind])
      .then((result) => active && setItems(result[key] ?? []))
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : `Could not load ${label.toLowerCase()}.`)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [kind, label])

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return items
    return items.filter((item) => JSON.stringify(item).toLocaleLowerCase().includes(normalized))
  }, [items, query])

  return (
    <div className="ad-directory-page">
      <PageHeader
        title={label}
        actions={
          kind === 'admin' ? <><InviteDialog kind="admin" /><InviteHistory kind="admin" /></> :
          kind === 'student' ? <><InviteDialog kind="student" /><InviteHistory kind="student" /></> :
          <><InviteDialog kind="author" /><InviteHistory kind="author" /></>
        }
      />
      <section className="ad-section ad-section--plain">
        <div className="ad-section-heading">
          <div>
            <h2>Current {label.toLocaleLowerCase()}</h2>
            <p>{visible.length}{query ? ` of ${items.length}` : ''} total</p>
          </div>
          <DirectorySearch
            query={query}
            onQueryChange={setQuery}
            placeholder={`Search ${label.toLocaleLowerCase()}`}
          />
        </div>
        <DataState loading={loading} error={error} />
        {!loading && !error && (visible.length ? (
          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead><tr><th>{kind === 'course' ? 'Course' : 'Name'}</th><th>{kind === 'course' ? 'Author' : 'Email'}</th><th>Status</th><th>Joined</th></tr></thead>
              <tbody>
                {visible.map((item) => {
                  if (kind === 'course') {
                    const entry = item as AdminCourseEntry
                    return <tr key={entry.course.id}><td><Link className="ad-table-link" href={`/courses/detail?id=${encodeURIComponent(entry.course.id)}`}>{entry.course.name}</Link></td><td>{entry.author ? `${entry.author.firstName} ${entry.author.lastName}` : 'Unknown'}</td><td><Badge>{entry.course.type === 'live' ? 'Live' : 'Premade'}</Badge></td><td>{date(entry.course.createdAt)}</td></tr>
                  }
                  const person = item as AdminDirectoryEntry | AuthorDirectoryEntry | StudentDirectoryEntry
                  const detailHref = kind === 'admin' ? null : `/${kind}s/detail?id=${encodeURIComponent(person.id)}`
                  return <tr key={person.id}><td>{detailHref ? <Link className="ad-table-link" href={detailHref}>{nameOf(person)}</Link> : nameOf(person)}</td><td>{person.email}</td><td><Badge dot tone={person.disabledAt ? 'red' : 'green'}>{person.disabledAt ? 'Disabled' : 'Active'}</Badge></td><td>{date(person.createdAt)}</td></tr>
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="ad-empty-line">No {label.toLocaleLowerCase()} found.</p>)}
      </section>
    </div>
  )
}

export function AdminOverview() {
  const [counts, setCounts] = useState<Record<DirectoryKind, number> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    void Promise.all([
      apiFetch<{ admins: AdminDirectoryEntry[] }>('/api/admins'),
      apiFetch<{ authors: AuthorDirectoryEntry[] }>('/api/authors'),
      apiFetch<{ students: StudentDirectoryEntry[] }>('/api/students'),
      apiFetch<{ courses: AdminCourseEntry[] }>('/api/courses'),
    ]).then(([admins, authors, students, courses]) => setCounts({ admin: admins.admins.length, author: authors.authors.length, student: students.students.length, course: courses.courses.length }))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load dashboard data.'))
  }, [])
  const cards: Array<[DirectoryKind, string]> = [['author', '/authors'], ['student', '/students'], ['admin', '/admins'], ['course', '/courses']]
  return <div className="ad-overview"><header className="sb-page-header ad-overview-header"><h1>Overview</h1></header><section className="ad-directory"><div className="ad-directory-grid">{cards.map(([kind, href]) => <Link className="ad-directory-card" href={href} key={kind}><span className="ad-directory-card-label">{labelByKind[kind]}</span><strong>{counts ? counts[kind] : '—'}</strong><span className="ad-directory-card-note">Manage {labelByKind[kind].toLocaleLowerCase()}</span></Link>)}</div></section>{error ? <p className="ad-empty-line">{error}</p> : null}</div>
}

export function AdminSecurityPage() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    void apiFetch<{ admin: AdminProfile }>('/api/auth/me').then(({ admin: profile }) => setAdmin(profile)).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load security settings.'))
  }, [])
  return <div className="ad-settings-page"><PageHeader title="Security settings" />{admin ? <><SecurityForm admin={admin} /><MfaPolicyPanel /></> : <DataState loading={!error} error={error} />}</div>
}

export function AdminDetail({ kind }: { kind: Exclude<DirectoryKind, 'admin'> }) {
  const params = useSearchParams()
  const id = params.get('id')
  const [detail, setDetail] = useState<AdminAuthorDetail | AdminStudentDetail | AdminCourseDetail | null>(null)
  const [error, setError] = useState('')
  const [courseGovernance, setCourseGovernance] = useState<CourseGovernanceDetail | null>(null)
  const [courseGovernanceError, setCourseGovernanceError] = useState('')
  useEffect(() => {
    if (!id) return
    void apiFetch<AdminAuthorDetail | AdminStudentDetail | AdminCourseDetail>(`${endpointByKind[kind]}/${encodeURIComponent(id)}`)
      .then(setDetail)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : `Could not load this ${kind}.`))
  }, [id, kind])
  useEffect(() => {
    if (kind !== 'course' || !id) return
    void apiFetch<CourseGovernanceDetail>(`/api/content-assessment/content/${encodeURIComponent(id)}`)
      .then(setCourseGovernance)
      .catch((cause: unknown) => setCourseGovernanceError(cause instanceof Error ? cause.message : 'Could not load course review history.'))
  }, [id, kind])
  const back = `/${kind}s`
  if (!detail) {
    const message = error || (!id ? `Choose a ${kind} from the directory.` : '')
    return <div className="ad-directory-page"><PageHeader title={`${labelByKind[kind]} details`} /><DataState loading={!message} error={message} /><Link href={back} className="sb-button sb-button--secondary">Back to {labelByKind[kind].toLocaleLowerCase()}</Link></div>
  }
  if ('course' in detail) {
    return <div className="ad-course-detail"><Link className="ad-course-back" href="/courses">Back to courses</Link><PageHeader title={detail.course.name} description={`${detail.course.type === 'live' ? 'Live class' : 'Premade course'} · ${detail.course.durationMinutes} minutes`} actions={courseGovernance ? <Badge dot tone={courseStatusTone(courseGovernance.content)}>{courseStatus(courseGovernance.content)}</Badge> : null} /><section className="ad-section ad-section--plain"><CourseGovernanceSummary governance={courseGovernance} error={courseGovernanceError} /></section><section className="ad-section"><h2>Modules</h2>{detail.modules.length ? <ol>{detail.modules.map((module) => <li key={module.id}><strong>{module.title}</strong><p>{module.content}</p></li>)}</ol> : <p>No modules yet.</p>}</section></div>
  }
  if ('student' in detail) {
    return <div className="ad-directory-page"><PageHeader title={`${detail.student.firstName} ${detail.student.lastName}`} /><p>{detail.student.email}</p><section className="ad-section"><h2>Learning record</h2><p>{detail.courses.length} course enrollment{detail.courses.length === 1 ? '' : 's'}.</p></section></div>
  }
  const authorDetail = detail as AdminAuthorDetail
  return <div className="ad-directory-page"><PageHeader title={`${authorDetail.author.firstName} ${authorDetail.author.lastName}`} /><p>{authorDetail.author.email}</p><section className="ad-section"><h2>Courses</h2><p>{authorDetail.courses.length} course{authorDetail.courses.length === 1 ? '' : 's'} created.</p></section></div>
}

type CourseGovernanceDetail = {
  content: {
    id: string
    reviewStatus: string
    publicationStatus: string
    currentVersion: ContentVersion | null
    submittedAt: string | null
    approvedAt: string | null
    publishedAt: string | null
    updatedAt: string
  }
  versions: ContentVersion[]
  reviews: ContentReview[]
}

const courseStatus = (content: CourseGovernanceDetail['content']) =>
  content.publicationStatus === 'archived' ? 'Archived' : content.publicationStatus === 'published' ? 'Published' : content.reviewStatus === 'approved' ? 'Approved' : content.reviewStatus === 'pending_review' ? 'Pending review' : content.reviewStatus === 'needs_revision' ? 'Needs revision' : content.reviewStatus === 'rejected' ? 'Rejected' : 'Draft'

const courseStatusTone = (content: CourseGovernanceDetail['content']) => {
  const status = courseStatus(content)
  return status === 'Published' || status === 'Approved' ? 'green' : status === 'Rejected' ? 'red' : status === 'Needs revision' || status === 'Pending review' ? 'amber' : 'blue'
}

function CourseGovernanceSummary({ governance, error }: { governance: CourseGovernanceDetail | null; error: string }) {
  if (error && !governance) return <p className="ad-empty-line">Version history and review details are unavailable: {error}</p>
  if (!governance) return <p className="ad-empty-line">Loading course version history…</p>
  const { content } = governance
  return <>
    <div className="ad-detail-grid"><div><span className="ad-directory-card-label">Current status</span><strong>{courseStatus(content)}</strong></div><div><span className="ad-directory-card-label">Current version</span><strong>{content.currentVersion?.label ?? 'No version yet'}</strong></div><div><span className="ad-directory-card-label">Submitted</span><strong>{dateOrDash(content.submittedAt)}</strong></div><div><span className="ad-directory-card-label">Approved</span><strong>{dateOrDash(content.approvedAt)}</strong></div><div><span className="ad-directory-card-label">Published</span><strong>{dateOrDash(content.publishedAt)}</strong></div><div><span className="ad-directory-card-label">Last updated</span><strong>{dateOrDash(content.updatedAt)}</strong></div></div>
    <CourseReviewChecklist reviews={governance.reviews} />
    <div className="ad-section-heading ad-course-history-heading"><div><h2>Version history</h2><p>Drafts, reviewed versions and published versions remain auditable.</p></div><Link className="ad-text-link" href={`/content-assessment/content/${encodeURIComponent(content.id)}`}>Open review workspace</Link></div>
    <CourseVersionTable versions={governance.versions} />
    <div className="ad-section-heading ad-course-history-heading"><div><h2>Review dates</h2><p>Every decision is retained with its reviewer and date.</p></div></div>
    {governance.reviews.length ? <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Version</th><th>Decision</th><th>Reviewed on</th><th>Reviewer</th><th>Summary</th></tr></thead><tbody>{governance.reviews.map((review) => <tr key={review.id}><td>{governance.versions.find((version) => version.id === review.versionId)?.label ?? '—'}</td><td><Badge>{review.decision.replace(/_/g, ' ')}</Badge></td><td>{dateOrDash(review.createdAt)}</td><td>{review.reviewer.firstName} {review.reviewer.lastName}</td><td>{review.summary || '—'}</td></tr>)}</tbody></table></div> : <p className="ad-empty-line">No course reviews yet.</p>}
  </>
}

function CourseReviewChecklist({ reviews }: { reviews: ContentReview[] }) {
  const latest = reviews[0]
  const criteria: Array<[string, string]> = [['technical_accuracy', 'Technical accuracy'], ['brand_consistency', 'Brand consistency'], ['copyright_ip', 'Copyright / IP'], ['safety_regulatory', 'Safety & regulatory'], ['content_quality', 'Content quality']]
  return <div className="ad-course-checklist"><div><h2>Content review checklist</h2><p>Review criteria belong to the course and are tracked here as checklist items.</p></div><div className="ad-checklist-grid">{criteria.map(([key, label]) => <label className="ad-checkbox-field" key={key}><input type="checkbox" disabled checked={Boolean(latest?.criteria.some((criterion) => criterion.criterion === key && criterion.score != null))} readOnly /><span><strong>{label}</strong><small>{latest ? `Reviewed ${dateOrDash(latest.createdAt)}` : 'Not reviewed'}</small></span></label>)}</div></div>
}

function CourseVersionTable({ versions }: { versions: ContentVersion[] }) {
  if (!versions.length) return <p className="ad-empty-line">No course versions yet.</p>
  return <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Version</th><th>Status</th><th>Created by</th><th>Drafted on</th><th>Published on</th><th>Changes</th></tr></thead><tbody>{versions.map((version) => <tr key={version.id}><td>{version.label || `v${version.number}`}</td><td><Badge dot tone={version.state === 'published' ? 'green' : version.state === 'draft' ? 'blue' : version.state === 'superseded' ? 'red' : 'violet'}>{version.state}</Badge></td><td>{version.createdBy.firstName} {version.createdBy.lastName}</td><td>{dateOrDash(version.createdAt)}</td><td>{dateOrDash(version.publishedAt)}</td><td>{version.changeSummary || '—'}</td></tr>)}</tbody></table></div>
}

const dateOrDash = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-NG') : '—'
