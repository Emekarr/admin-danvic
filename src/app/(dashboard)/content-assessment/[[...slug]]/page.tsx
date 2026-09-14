import { ContentAssessmentRoute } from '@/components/content-assessment'

export const metadata = { title: 'Content Assessment' }

export function generateStaticParams() {
  return [
    [], ['content'], ['content', 'pending'], ['content', 'approved'], ['content', 'rejected'], ['content', 'published'], ['content', 'archived'],
    ['assessments'], ['assessments', 'assignments'], ['assessments', 'quizzes'], ['assessments', 'exams'], ['assessments', 'pending'], ['question-bank'],
    ['reviews'], ['reviews', 'technical-accuracy'], ['reviews', 'brand-consistency'], ['reviews', 'copyright-ip'], ['reviews', 'safety-regulatory'], ['reviews', 'content-quality'], ['reviews', 'history'],
    ['versions'], ['versions', 'published'], ['versions', 'drafts'], ['versions', 'history'], ['versions', 'controlled-updates'], ['review-dates'], ['tutors'], ['tutors', 'pending'], ['tutors', 'approved'], ['tutors', 'rejected'], ['tutors', 'requires-updates'],
    ['tutors', 'overview'],
  ].map((slug) => ({ slug }))
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params
  return <ContentAssessmentRoute slug={slug} />
}
