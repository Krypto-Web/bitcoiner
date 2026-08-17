"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, RefreshCw, Shield } from "lucide-react"

interface SiteCaptchaGateProps {
  children: React.ReactNode
}

interface CaptchaQuestion {
  text: string
  correctAnswer: number
}

const SESSION_STORAGE_KEY = "captcha-verified"

// Verification is throttled client-side so guessing gets slower with every
// wrong answer instead of firing instantly - see the security note below.
const BASE_VERIFY_DELAY_MS = 600
const WRONG_ANSWER_PENALTY_MS = 400
const MAX_VERIFY_DELAY_MS = 2500

const RETRY_MESSAGES = [
  "Not quite — here's a new problem.",
  "Still not it. Take your time with the new one.",
  "No rush — solve the problem above whenever you're ready.",
]

function generateQuestion(): CaptchaQuestion {
  const operations: Array<() => CaptchaQuestion> = [
    () => {
      const a = Math.floor(Math.random() * 50) + 1
      const b = Math.floor(Math.random() * 50) + 1
      return { text: `${a} + ${b}`, correctAnswer: a + b }
    },
    () => {
      // Ranges are picked so the result is always positive.
      const a = Math.floor(Math.random() * 30) + 21 // 21-50
      const b = Math.floor(Math.random() * 20) + 1 // 1-20
      return { text: `${a} - ${b}`, correctAnswer: a - b }
    },
    () => {
      const a = Math.floor(Math.random() * 12) + 2 // 2-13
      const b = Math.floor(Math.random() * 12) + 2 // 2-13
      return { text: `${a} × ${b}`, correctAnswer: a * b }
    },
  ]

  const randomOperation = operations[Math.floor(Math.random() * operations.length)]
  return randomOperation()
}

function getRetryMessage(attempts: number): string {
  const index = Math.min(Math.max(attempts - 1, 0), RETRY_MESSAGES.length - 1)
  return RETRY_MESSAGES[index]
}

// sessionStorage can throw in some private-browsing contexts, so these
// helpers fail safe instead of crashing the gate.
function readSessionVerified(): boolean {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

function writeSessionVerified() {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, "true")
  } catch {
    // Worst case the user is asked to verify again next visit.
  }
}

/**
 * Gates `children` behind a simple math challenge.
 *
 * Security note: this is a client-side deterrent, not real bot protection.
 * It filters out casual bots and casual repeat visits, but anyone who
 * disables JavaScript, edits the bundle, or flips React state in devtools
 * can get past it - the check never touches a server. To actually protect
 * a route, verify the answer in an API route, issue a short-lived signed
 * token on success, store that token instead of a plain "true" flag, and
 * check it server-side (middleware or route handler) before returning
 * protected content.
 */
export function SiteCaptchaGate({ children }: SiteCaptchaGateProps) {
  const [isInitializing, setIsInitializing] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [answer, setAnswer] = useState("")
  const [question, setQuestion] = useState<CaptchaQuestion>({ text: "", correctAnswer: 0 })
  const [attempts, setAttempts] = useState(0)
  const [showError, setShowError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Resolve verification status once, before rendering the challenge, so
    // an already-verified visitor never sees a flash of the CAPTCHA form.
    if (readSessionVerified()) {
      setIsVerified(true)
    } else {
      setQuestion(generateQuestion())
    }
    setIsInitializing(false)
  }, [])

  useEffect(() => {
    if (!isInitializing && !isVerified) {
      inputRef.current?.focus()
    }
  }, [question, isInitializing, isVerified])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim() || isLoading) return

    setIsLoading(true)

    const userAnswer = Number.parseInt(answer.trim(), 10)
    const isCorrect = userAnswer === question.correctAnswer

    // Base delay always applies; wrong answers get progressively slower.
    const delay = isCorrect
      ? BASE_VERIFY_DELAY_MS
      : Math.min(BASE_VERIFY_DELAY_MS + attempts * WRONG_ANSWER_PENALTY_MS, MAX_VERIFY_DELAY_MS)
    await new Promise((resolve) => setTimeout(resolve, delay))

    if (isCorrect) {
      setIsVerified(true)
      writeSessionVerified()
    } else {
      setAttempts((prev) => prev + 1)
      setAnswer("")
      setQuestion(generateQuestion())
      setShowError(true)
    }

    setIsLoading(false)
  }

  const handleRefresh = () => {
    setQuestion(generateQuestion())
    setAnswer("")
    setShowError(false)
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          <span className="font-mono text-sm">Checking your session...</span>
        </div>
      </div>
    )
  }

  if (isVerified) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          <CardTitle className="font-sans text-xl">Security Verification</CardTitle>
          <CardDescription className="font-mono">Please solve this simple math problem to continue</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center">
              <div className="bg-muted p-6 rounded-lg border border-border">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl font-mono font-bold text-foreground" aria-live="polite">
                    {question.text} = ?
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    aria-label="Get a different question"
                    className="ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline text-xs">New question</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="captcha-answer" className="block text-sm font-medium text-foreground text-center">
                Your answer
              </label>
              <input
                ref={inputRef}
                id="captcha-answer"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value)
                  if (showError) setShowError(false)
                }}
                placeholder="Enter your answer"
                disabled={isLoading}
                aria-invalid={showError}
                aria-describedby={showError ? "captcha-error" : undefined}
                className="w-full px-3 py-2 bg-input border border-border rounded-md font-mono text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                required
                autoFocus
              />
            </div>

            <div className="min-h-[2.5rem] text-center">
              {showError && (
                <div id="captcha-error" role="alert" className="space-y-1">
                  <p className="text-sm text-destructive font-mono">{getRetryMessage(attempts)}</p>
                  {attempts >= 3 && <p className="text-xs text-muted-foreground">Attempt {attempts}</p>}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={!answer.trim() || isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {isLoading ? "Verifying..." : "Verify & Continue"}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground font-mono">
            This verification helps protect against automated access
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
