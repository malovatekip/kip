import React, { useState, useEffect } from 'react'
import {
  BookOpen, CheckCircle, Lock, Star, Award, ChevronRight,
  ArrowLeft, Zap, RotateCcw, Trophy, ChevronDown, ChevronUp
} from 'lucide-react'
import Layout from '../components/Layout'
import KipMarkdown from '../components/KipMarkdown'
import api from '../lib/api'
import toast from 'react-hot-toast'

// ── Badge card ────────────────────────────────────────────────────────────────
function BadgeCard({ badge }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 12,
      background: `${badge.color}14`,
      border: `1px solid ${badge.color}40`,
    }}>
      <div style={{ fontSize: 28, lineHeight: 1 }}>{badge.icon}</div>
      <div>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
          {badge.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          Score: {badge.score}% · {new Date(badge.earned_at).toLocaleDateString('en-ZM', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </div>
  )
}

// ── Course card ────────────────────────────────────────────────────────────────
function CourseCard({ course, onSelect }) {
  const pct = course.progress_pct || 0
  return (
    <div onClick={() => onSelect(course)}
      className="kip-card"
      style={{
        padding: '20px 20px', cursor: 'pointer',
        border: course.badge_earned
          ? `1px solid ${course.color}50`
          : '1px solid var(--border)',
        background: course.badge_earned
          ? `linear-gradient(135deg, ${course.color}0A, transparent)`
          : undefined,
        transition: 'all 0.2s ease',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 28 }}>{course.icon}</div>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>{course.title}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{course.subtitle}</div>
          </div>
        </div>
        {course.badge_earned && (
          <div style={{ fontSize: 20, flexShrink: 0 }}>{course.badge_icon}</div>
        )}
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
        {course.description}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20,
          background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
          {course.difficulty}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          ~{course.estimated_mins} mins
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {course.lessons_completed}/{course.lesson_count} lessons
        </span>
        {course.assessment_score !== null && (
          <span style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700,
            color: course.assessment_score >= 70 ? 'var(--green)' : 'var(--gold)' }}>
            Assessment: {course.assessment_score}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: course.badge_earned ? course.color : 'var(--blue)',
          width: `${pct}%`,
          transition: 'width 0.4s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {pct === 0 ? 'Not started' : pct === 100 ? 'All lessons done' : `${pct}% through lessons`}
        </span>
        <span style={{ fontSize: 11, color: 'var(--blue-bright)', fontFamily: 'Syne', fontWeight: 600 }}>
          {course.badge_earned ? `${course.badge_icon} Badge earned` : pct === 0 ? 'Start →' : 'Continue →'}
        </span>
      </div>
    </div>
  )
}

// ── Lesson view ────────────────────────────────────────────────────────────────
function LessonView({ course, lesson, lessonIndex, totalLessons, onComplete, onBack }) {
  const [quizAnswer,  setQuizAnswer]  = useState(null)
  const [quizResult,  setQuizResult]  = useState(null)
  const [completing,  setCompleting]  = useState(false)
  const [expanded,    setExpanded]    = useState(true)

  const checkQuiz = () => {
    if (quizAnswer === null) { toast.error('Select an answer first.'); return }
    const correct = quizAnswer === lesson.quiz.correct
    setQuizResult({ correct, explanation: lesson.quiz.explanation })
  }

  const handleComplete = async () => {
    if (lesson.quiz && !quizResult) { toast.error('Complete the quiz first.'); return }
    setCompleting(true)
    try {
      await api.post('/learn/complete-lesson', {
        course_id: course.id,
        lesson_id: lesson.id,
      })
      onComplete()
    } catch { toast.error('Could not save progress.') }
    finally   { setCompleting(false) }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
            {course.title} · Lesson {lessonIndex + 1} of {totalLessons}
          </div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            {lesson.title}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
        {Array.from({ length: totalLessons }, (_, i) => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 2,
            background: i < lessonIndex ? course.color : i === lessonIndex ? 'var(--blue)' : 'var(--border)',
          }} />
        ))}
      </div>

      {/* Content */}
      <div className="kip-card" style={{ padding: '20px 22px', marginBottom: 14 }}>
        <KipMarkdown content={lesson.content} />
      </div>

      {/* Quiz */}
      {lesson.quiz && (
        <div style={{ border: `1px solid ${quizResult ? (quizResult.correct ? 'rgba(26,224,110,0.4)' : 'rgba(232,62,38,0.4)') : 'var(--border)'}`, borderRadius: 14, padding: '18px 20px', marginBottom: 14, background: 'var(--card)' }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 14 }}>
            Quick Check
          </div>
          <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12, lineHeight: 1.6 }}>
            {lesson.quiz.question}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {lesson.quiz.options.map((opt, i) => {
              let bg = 'var(--input-bg)', border = 'var(--border)', color = 'var(--text)'
              if (quizResult) {
                if (i === lesson.quiz.correct) { bg = 'rgba(26,224,110,0.1)'; border = 'rgba(26,224,110,0.4)'; color = 'var(--green)' }
                else if (i === quizAnswer && !quizResult.correct) { bg = 'rgba(232,62,38,0.1)'; border = 'rgba(232,62,38,0.4)'; color = 'var(--red)' }
              } else if (i === quizAnswer) {
                bg = 'var(--blue-dim)'; border = 'rgba(43,127,255,0.4)'; color = 'var(--blue-bright)'
              }
              return (
                <button key={i} onClick={() => !quizResult && setQuizAnswer(i)}
                  disabled={!!quizResult}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10, cursor: quizResult ? 'default' : 'pointer',
                    background: bg, border: `1px solid ${border}`,
                    fontFamily: 'Plus Jakarta Sans', fontSize: 13, color, textAlign: 'left',
                  }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${border}`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              )
            })}
          </div>
          {!quizResult && (
            <button onClick={checkQuiz} className="kip-btn kip-btn-ghost" style={{ fontSize: 13, padding: '8px 16px' }}>
              Check Answer
            </button>
          )}
          {quizResult && (
            <div style={{ padding: '10px 14px', borderRadius: 10,
              background: quizResult.correct ? 'rgba(26,224,110,0.08)' : 'rgba(232,151,62,0.08)',
              border: `1px solid ${quizResult.correct ? 'rgba(26,224,110,0.3)' : 'rgba(232,151,62,0.3)'}` }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
                color: quizResult.correct ? 'var(--green)' : 'var(--gold)', marginBottom: 4 }}>
                {quizResult.correct ? '✓ Correct!' : '✗ Not quite'}
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                {quizResult.explanation}
              </p>
            </div>
          )}
        </div>
      )}

      <button onClick={handleComplete} disabled={completing} className="kip-btn kip-btn-primary"
        style={{ width: '100%', padding: '13px 0', fontSize: 14 }}>
        {completing
          ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} />
          : <>{lessonIndex + 1 === totalLessons ? 'Complete Lessons → Take Assessment' : 'Next Lesson'} <ChevronRight size={16} /></>
        }
      </button>
    </div>
  )
}

// ── Assessment view ────────────────────────────────────────────────────────────
function AssessmentView({ course, questions, onSubmit, onBack }) {
  const [answers,    setAnswers]    = useState(Array(questions.length).fill(null))
  const [submitting, setSubmitting] = useState(false)

  const allAnswered = answers.every(a => a !== null)

  const handleSubmit = async () => {
    if (!allAnswered) { toast.error(`Answer all ${questions.length} questions first.`); return }
    setSubmitting(true)
    try {
      const { data } = await api.post('/learn/submit-assessment', {
        course_id: course.id,
        answers,
      })
      onSubmit(data)
    } catch { toast.error('Submission failed. Try again.') }
    finally   { setSubmitting(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            Final Assessment
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {course.title} · Score 70%+ to earn your badge
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.25)', borderRadius: 12, marginBottom: 18, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text)' }}>FinScope-aligned assessment.</strong> These questions mirror the Bank of Zambia's multidimensional financial literacy framework. Answer all {questions.length} questions honestly. You need <strong style={{ color: 'var(--blue-bright)' }}>70%</strong> to earn your badge.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
        {questions.map((q, qi) => (
          <div key={qi} className="kip-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>
              <span style={{ color: 'var(--blue-bright)', marginRight: 8 }}>{qi + 1}.</span>
              {q.q}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {q.options.map((opt, oi) => (
                <button key={oi} onClick={() => {
                  const newAns = [...answers]; newAns[qi] = oi; setAnswers(newAns)
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                  background: answers[qi] === oi ? 'var(--blue-dim)' : 'var(--input-bg)',
                  border: `1px solid ${answers[qi] === oi ? 'rgba(43,127,255,0.4)' : 'var(--border)'}`,
                  fontFamily: 'Plus Jakarta Sans', fontSize: 12.5,
                  color: answers[qi] === oi ? 'var(--blue-bright)' : 'var(--text)',
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: answers[qi] === oi ? 'var(--blue)' : 'transparent',
                    border: `2px solid ${answers[qi] === oi ? 'var(--blue)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: answers[qi] === oi ? '#fff' : 'var(--faint)',
                  }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 12 }}>
        {answers.filter(a => a !== null).length}/{questions.length} answered
      </div>

      <button onClick={handleSubmit} disabled={submitting || !allAnswered}
        className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14, opacity: !allAnswered ? 0.6 : 1 }}>
        {submitting
          ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} />
          : <><Zap size={15} /> Submit Assessment</>
        }
      </button>
    </div>
  )
}

// ── Result view ────────────────────────────────────────────────────────────────
function ResultView({ result, course, onRetry, onBack }) {
  const [showAll, setShowAll] = useState(false)
  return (
    <div>
      {/* Score */}
      <div style={{
        textAlign: 'center', padding: '28px 20px', marginBottom: 18, borderRadius: 16,
        background: result.passed
          ? 'linear-gradient(135deg, rgba(26,224,110,0.12), rgba(43,127,255,0.06))'
          : 'linear-gradient(135deg, rgba(232,151,62,0.12), rgba(232,62,38,0.06))',
        border: `1px solid ${result.passed ? 'rgba(26,224,110,0.3)' : 'rgba(232,151,62,0.3)'}`,
      }}>
        {result.badge_earned && (
          <div style={{ fontSize: 48, marginBottom: 8 }}>{result.badge_earned.icon}</div>
        )}
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 40,
          color: result.passed ? 'var(--green)' : 'var(--gold)', marginBottom: 4 }}>
          {result.score}%
        </div>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
          {result.passed ? `Badge Earned: ${result.badge_earned?.name}` : 'Not passed yet'}
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{result.message}</p>
        <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 8 }}>
          {result.correct} of {result.total} correct · Need {Math.ceil(result.total * 0.7)} to pass
        </div>
      </div>

      {/* Review answers */}
      <button onClick={() => setShowAll(s => !s)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
          fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', cursor: 'pointer', marginBottom: 12 }}>
        {showAll ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        {showAll ? 'Hide' : 'Review'} answers
      </button>

      {showAll && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {result.results.map((r, i) => (
            <div key={i} style={{
              padding: '12px 14px', borderRadius: 12,
              background: r.correct ? 'rgba(26,224,110,0.06)' : 'rgba(232,62,38,0.06)',
              border: `1px solid ${r.correct ? 'rgba(26,224,110,0.25)' : 'rgba(232,62,38,0.25)'}`,
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: r.correct ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
                  {r.correct ? '✓' : '✗'}
                </span>
                <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600 }}>{r.question}</div>
              </div>
              {!r.correct && (
                <div style={{ fontSize: 12, color: 'var(--muted)', paddingLeft: 20 }}>
                  Your answer: <span style={{ color: 'var(--red)' }}>{r.your_answer}</span>
                  {' · '}Correct: <span style={{ color: 'var(--green)' }}>{r.correct_answer}</span>
                </div>
              )}
              {r.explanation && (
                <div style={{ fontSize: 12, color: 'var(--faint)', paddingLeft: 20, marginTop: 3, fontStyle: 'italic' }}>
                  {r.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {!result.passed && (
          <button onClick={onRetry} className="kip-btn kip-btn-primary" style={{ flex: 1, fontSize: 13 }}>
            <RotateCcw size={14} /> Try Again
          </button>
        )}
        <button onClick={onBack} className="kip-btn kip-btn-ghost" style={{ flex: 1, fontSize: 13 }}>
          <BookOpen size={14} /> {result.passed ? 'Back to Courses' : 'Review Lessons'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const [courses,      setCourses]      = useState([])
  const [badges,       setBadges]       = useState([])
  const [selected,     setSelected]     = useState(null)   // current course
  const [view,         setView]         = useState('list') // list|course|lesson|assessment|result
  const [currentLesson,setCurrentLesson]= useState(0)
  const [assessmentQs, setAssessmentQs] = useState([])
  const [result,       setResult]       = useState(null)
  const [loading,      setLoading]      = useState(true)

  const loadCourses = () => {
    api.get('/learn/courses')
      .then(r => setCourses(r.data.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadBadges = () => {
    api.get('/learn/my-progress')
      .then(r => setBadges(r.data.badges || []))
      .catch(() => {})
  }

  useEffect(() => { loadCourses(); loadBadges() }, [])

  const openCourse = (course) => {
    setLoading(true) // Show the loading spinner while fetching

    api.get(`/learn/courses/${course.id}`)
      .then(r => {
        // Handle both common API formats (r.data.course or direct r.data)
        const fullCourse = r.data.course || r.data

        setSelected(fullCourse)
        setCurrentLesson(fullCourse.lessons_completed || 0)
        setView('course')
        setResult(null)
      })
      .catch(() => {
        toast.error('Could not load course lessons.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

//   const openCourse = (course) => {
//     setSelected(course)
//     setCurrentLesson(course.lessons_completed || 0)
//     setView('course')
//     setResult(null)
//   }

  const startLesson = (idx) => {
    setCurrentLesson(idx)
    setView('lesson')
  }

  const afterLessonComplete = () => {
    loadCourses()
    const nextIdx = currentLesson + 1
    if (nextIdx < selected.lesson_count) {
      setCurrentLesson(nextIdx)
      // Stay in lesson view, but update index
      setCurrentLesson(nextIdx)
    } else {
      // All lessons done — go to assessment
      api.get(`/learn/courses/${selected.id}`)
        .then(r => {
          // We don't expose assessment questions from GET, build locally
          // Re-fetch the full course from our COURSES array via assessment route
        })
        .catch(() => {})
      setView('assessment')
      // Get the questions from the backend indirectly by loading from constants
      // We pass them via the course detail endpoint
      api.get(`/learn/courses/${selected.id}`)
        .then(() => {})
        .catch(() => {})
      // The questions are embedded in the course object we have
      // Actually we need to fetch them — let's use a GET assessment endpoint
      // For now, trigger a courses refresh so the UI updates
      loadCourses()
      setView('assessment')
    }
  }

  const handleAssessmentSubmit = (res) => {
    setResult(res)
    setView('result')
    loadCourses()
    loadBadges()
  }

  const refreshSelected = () => {
    if (selected) {
      const updated = courses.find(c => c.id === selected.id)
      if (updated) setSelected(updated)
    }
  }

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(43,127,255,0.2)', borderTopColor: 'var(--blue)', animation: 'spinSlow 0.8s linear infinite' }} />
      </div>
    </Layout>
  )

  // ── Assessment questions helper ──────────────────────────────────────────
  // We embed questions in the page for now since our backend GET /courses/:id
  // doesn't expose them (by design — only submit endpoint uses them)
  const COURSE_ASSESSMENT_QS = {
    financial_literacy_101: [
      { q: "If you borrow K5,000 at an annual interest rate of 12%, how much interest will you pay after 6 months?", options: ["K600","K300","K60","K150"], correct: 1 },
      { q: "Which document proves your business is legally registered in Zambia?", options: ["NRC","PACRA Certificate","ZRA TPIN","Bank Statement"], correct: 1 },
      { q: "Your business makes K8,000 in revenue this month and total costs are K5,500. What is your profit margin?", options: ["68.75%","31.25%","45.5%","27.5%"], correct: 1 },
      { q: "What is the purpose of a cash reserve in a business?", options: ["To invest in property when possible","To cover expenses during slow months or emergencies","To pay dividends to business owners","To avoid paying tax"], correct: 1 },
      { q: "Mobile money penetration in Zambia reached what level in 2025, per FinScope?", options: ["58.4%","69.4%","76.1%","80.1%"], correct: 2 },
      { q: "You earn K3,000 this week. The BEST financial behaviour is to:", options: ["Spend freely and save whatever is left","Immediately reinvest all into stock","Pay yourself a fixed amount, cover costs, then save the rest","Keep it all in cash at home"], correct: 2 },
      { q: "What is the break-even point for K1,200 fixed costs, items priced at K40, variable cost K25?", options: ["30 items","48 items","80 items","60 items"], correct: 2 },
      { q: "According to FinScope 2025, what percentage of Zambian adults are financially literate?", options: ["23.6%","39.1%","46.1%","69.4%"], correct: 2 },
      { q: "Which of these is an example of GOOD financial behaviour?", options: ["Same wallet for personal and business","Keeping a daily record of income and expenses","Reinvesting all profits and never paying yourself","Taking a bank loan for monthly operating costs"], correct: 1 },
      { q: "If sales increase from K6,000 to K7,800, what is the percentage increase?", options: ["13%","23.1%","30%","18%"], correct: 2 },
    ],
    financial_health_101: [
      { q: "At the end of a typical month, you:", options: ["Have money left over","Break exactly even","Run short and borrow","Don't track it"], correct: 0 },
      { q: "If you faced an unexpected K2,000 expense today, you would:", options: ["Cover it from savings without stress","Cover it but it would hurt","Have to borrow from family or kaloba","Not be able to cover it"], correct: 0 },
      { q: "How do you track your business income and expenses?", options: ["Record everything regularly","Track sometimes","Rough mental estimate","Don't track — check balance only"], correct: 0 },
      { q: "Per FinScope 2025, what % of Zambian adults are financially healthy (70%+ score)?", options: ["13.6%","39.1%","52.5%","67.4%"], correct: 1 },
      { q: "Do you have an emergency fund covering at least 1 month of expenses?", options: ["Yes, 1+ months saved","Partially — some savings","No, but plan to start","No, no immediate plan"], correct: 0 },
      { q: "Compared to 12 months ago, your financial position is:", options: ["Better — more savings or lower debt","About the same","Worse — more debt or fewer savings","Haven't thought about it"], correct: 0 },
      { q: "Do you separate business money from personal money?", options: ["Yes — completely separate accounts","Mostly — I try to","Sometimes","No — same wallet for everything"], correct: 0 },
      { q: "What is your savings habit?", options: ["Save a fixed amount before spending","Save whatever is left after spending","Save when I have a good month","Don't currently save"], correct: 0 },
    ],
    starting_business_zambia: [
      { q: "What does PACRA stand for?", options: ["Patents and Companies Registration Agency","Public Accounts and Corporate Revenue Authority","Private and Commercial Registration Authority","Patents, Commerce, and Regulatory Agency"], correct: 0 },
      { q: "Which fund targets Zambian citizens with business loans at 5% interest?", options: ["DBZ","ZANACO","CEEC","BOZ"], correct: 2 },
      { q: "Your business earns K12,000, costs are K8,400. Is this viable?", options: ["Yes — 30% profit margin is sustainable","No — the profit is too low","Cannot tell without knowing owner salary","Only if rent is under K1,000"], correct: 0 },
      { q: "Minimum recommended cash reserve for a new small business?", options: ["1 week of operating costs","1 month of operating costs","6 months of revenue","No reserve needed"], correct: 1 },
      { q: "CDF stands for:", options: ["Community Development Finance","Constituency Development Fund","Central Development Foundation","Citizens Development Facility"], correct: 1 },
    ],
  }

  return (
    <Layout>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 1 }}>

        {/* ── COURSE LIST ── */}
        {view === 'list' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(43,127,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={18} style={{ color: 'var(--blue-bright)' }} />
                </div>
                <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', margin: 0 }}>KIP Learn</h1>
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 600 }}>
                Interactive courses built on the Bank of Zambia's FinScope 2025 framework. Learn financial literacy, financial health, and entrepreneurship — earn badges when you score 70%+.
              </p>
            </div>

            {/* Badges earned */}
            {badges.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Your Badges ({badges.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                  {badges.map(b => <BadgeCard key={b.name} badge={b} />)}
                </div>
              </div>
            )}

            {/* FinScope context */}
            <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.2)', borderRadius: 12, marginBottom: 18 }}>
              <Zap size={14} style={{ color: 'var(--blue-bright)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0, lineHeight: 1.65 }}>
                <strong style={{ color: 'var(--text)' }}>Why this matters:</strong> The Zambia FinScope 2025 Survey (Bank of Zambia) found that only <strong style={{ color: 'var(--blue-bright)' }}>46.1%</strong> of Zambian adults are financially literate and only <strong style={{ color: 'var(--green)' }}>39.1%</strong> are financially healthy. KIP Learn is designed to help change those numbers.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {courses.map(c => <CourseCard key={c.id} course={c} onSelect={openCourse} />)}
            </div>
          </>
        )}

        {/* ── COURSE OVERVIEW ── */}
        {view === 'course' && selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>KIP Learn</div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{selected.title}</div>
              </div>
            </div>

            {/* Lesson list */}
            <div className="kip-card" style={{ padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 14 }}>
                Lessons
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.lessons?.map((lesson, i) => {
                  const done = i < (selected.lessons_completed || 0)
                  const current = i === (selected.lessons_completed || 0)
                  return (
                    <button key={lesson.id} onClick={() => done || current ? startLesson(i) : null}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 10, cursor: done || current ? 'pointer' : 'default',
                        background: done ? 'rgba(26,224,110,0.06)' : current ? 'var(--blue-dim)' : 'var(--input-bg)',
                        border: `1px solid ${done ? 'rgba(26,224,110,0.25)' : current ? 'rgba(43,127,255,0.3)' : 'var(--border)'}`,
                        textAlign: 'left',
                      }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? 'var(--green)' : current ? 'var(--blue)' : 'var(--border)' }}>
                        {done
                          ? <CheckCircle size={14} color="#fff" />
                          : current
                            ? <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{i+1}</span>
                            : <Lock size={12} color="var(--faint)" />
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontFamily: 'Syne', fontWeight: 600,
                          color: done ? 'var(--green)' : current ? 'var(--blue-bright)' : 'var(--faint)' }}>
                          {lesson.title}
                        </div>
                        {lesson.quiz && <div style={{ fontSize: 10, color: 'var(--faint)' }}>Includes quiz</div>}
                      </div>
                      {(done || current) && <ChevronRight size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Assessment CTA */}
            <div className="kip-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>
                    Final Assessment · {selected.badge_icon} {selected.badge_name} Badge
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {selected.assessment_score !== null
                      ? `Last score: ${selected.assessment_score}% · ${selected.badge_earned ? 'Badge earned!' : 'Try again to pass'}`
                      : `Score 70%+ to earn your badge · ${COURSE_ASSESSMENT_QS[selected.id]?.length || 0} questions`
                    }
                  </div>
                </div>
                <button
                  onClick={() => setView('assessment')}
                  disabled={selected.lessons_completed < 1}
                  className="kip-btn kip-btn-primary" style={{ fontSize: 13, padding: '9px 16px', opacity: selected.lessons_completed < 1 ? 0.5 : 1 }}>
                  {selected.badge_earned ? <><RotateCcw size={13} /> Retake</> : <><Trophy size={13} /> Take Assessment</>}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── LESSON ── */}
        {view === 'lesson' && selected && selected.lessons[currentLesson] && (
          <LessonView
            course={selected}
            lesson={selected.lessons[currentLesson]}
            lessonIndex={currentLesson}
            totalLessons={selected.lesson_count}
            onComplete={afterLessonComplete}
            onBack={() => setView('course')}
          />
        )}

        {/* ── ASSESSMENT ── */}
        {view === 'assessment' && selected && (
          <AssessmentView
            course={selected}
            questions={COURSE_ASSESSMENT_QS[selected.id] || []}
            onSubmit={handleAssessmentSubmit}
            onBack={() => setView('course')}
          />
        )}

        {/* ── RESULT ── */}
        {view === 'result' && selected && result && (
          <ResultView
            result={result}
            course={selected}
            onRetry={() => setView('assessment')}
            onBack={() => { setView('list'); loadCourses() }}
          />
        )}

      </div>
    </Layout>
  )
}
