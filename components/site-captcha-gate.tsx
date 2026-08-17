"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, RefreshCw, CheckCircle2, Lock, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SiteCaptchaGateProps {
  children: React.ReactNode
}

type Question = {
  text: string
  correctAnswer: number
  type: "math" | "sequence" | "compare" | "word"
}

export function SiteCaptchaGate({ children }: SiteCaptchaGateProps) {
  const [isVerified, setIsVerified] = useState(false)
  const [answer, setAnswer] = useState("")
  const [question, setQuestion] = useState<Question | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorShake, setErrorShake] = useState(false)

  const generateQuestion = useCallback((difficulty: number = 0): Question => {
    const level = Math.min(difficulty, 3)

    const generators: (() => Question)[] = [
      // Basic arithmetic
      () => {
        const a = Math.floor(Math.random() * (12 + level * 6)) + 3
        const b = Math.floor(Math.random() * (10 + level * 5)) + 2
        const ops = [
          { text: `${a} + ${b}`, answer: a + b },
          { text: `${a + b + 4} - ${b}`, answer: a + 4 },
          { text: `${a} × ${Math.min(b, 9)}`, answer: a * Math.min(b, 9) },
        ]
        const op = ops[Math.floor(Math.random() * ops.length)]
        return { text: op.text, correctAnswer: op.answer, type: "math" }
      },

      // Sequence
      () => {
        const start = Math.floor(Math.random() * 8) + 2
        const step = Math.floor(Math.random() * 4) + 2 + level
        const seq = [start, start + step, start + step * 2, start + step * 3]
        return {
          text: `${seq[0]}, ${seq[1]}, ${seq[2]}, ?`,
          correctAnswer: seq[3],
          type: "sequence",
        }
      },

      // Comparison / missing number
      () => {
        const a = Math.floor(Math.random() * 15) + 5
        const b = a + Math.floor(Math.random() * 8) + 2
        return {
          text: `What is ${b} − ${a}?`,
          correctAnswer: b - a,
          type: "compare",
        }
      },

      // Simple word-style
      () => {
        const items = Math.floor(Math.random() * 6) + 3
        const cost = Math.floor(Math.random() * 9) + 2
        return {
          text: `${items} items × $${cost} each = ?`,
          correctAnswer: items * cost,
          type: "word",
        }
      },
    ]

    return generators[Math.floor(Math.random() * generators.length)]()
  }, [])

  useEffect(() => {
    const verified = sessionStorage.getItem("captcha-verified")
    if (verified === "true") {
      setIsVerified(true)
    } else {
      setQuestion(generateQuestion(0))
    }
  }, [generateQuestion])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question || isLoading) return

    setIsLoading(true)

    // Artificial delay (helps against rapid bots)
    const delay = 700 + Math.random() * 600
    await new Promise((resolve) => setTimeout(resolve, delay))

    const userAnswer = Number.parseInt(answer.trim(), 10)

    if (userAnswer === question.correctAnswer) {
      setShowSuccess(true)
      // Small celebration delay
      await new Promise((resolve) => setTimeout(resolve, 900))
      setIsVerified(true)
      sessionStorage.setItem("captcha-verified", "true")
    } else {
      setErrorShake(true)
      setTimeout(() => setErrorShake(false), 500)
      setAttempts((prev) => prev + 1)
      setAnswer("")
      setQuestion(generateQuestion(attempts + 1))
    }

    setIsLoading(false)
  }

  const handleRefresh = () => {
    setQuestion(generateQuestion(attempts))
    setAnswer("")
    setErrorShake(false)
  }

  if (isVerified) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

      <Card
        className={cn(
          "w-full max-w-md border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5 transition-all duration-300",
          errorShake && "animate-shake"
        )}
      >
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-5 relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-inner">
              {showSuccess ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-in zoom-in duration-300" />
              ) : (
                <Shield className="w-8 h-8 text-primary" />
              )}
            </div>
            {!showSuccess && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center">
                <Lock className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
          </div>

          <CardTitle className="text-2xl font-semibold tracking-tight">
            {showSuccess ? "Verified" : "Security Check"}
          </CardTitle>
          <CardDescription className="text-sm mt-1.5">
            {showSuccess
              ? "You're good to go. Loading content..."
              : "Solve the challenge below to continue"}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {showSuccess ? (
            <div className="py-8 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground">Access granted</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Challenge Display */}
              <div className="relative">
                <div className="bg-muted/50 border border-border/50 rounded-xl p-6 text-center">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-medium">
                    {question?.type === "sequence"
                      ? "Complete the sequence"
                      : question?.type === "word"
                        ? "Calculate the total"
                        : "Solve"}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-mono font-bold tracking-tight text-foreground">
                      {question?.text ?? "…"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRefresh}
                      className="h-9 w-9 rounded-full hover:bg-background/80"
                      title="New challenge"
                    >
                      <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Answer Input */}
              <div className="space-y-2">
                <input
                  type="number"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Your answer"
                  className={cn(
                    "w-full h-12 px-4 rounded-xl border bg-background/50 text-center text-lg font-mono",
                    "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50",
                    "transition-all placeholder:text-muted-foreground/60",
                    errorShake && "border-destructive ring-2 ring-destructive/30"
                  )}
                  required
                  autoFocus
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>

              {/* Error / Attempts */}
              {attempts > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-destructive/90">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    Incorrect • {attempts} attempt{attempts !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={!answer.trim() || isLoading}
                className="w-full h-12 text-base font-medium rounded-xl"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Verifying…
                  </span>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-[11px] text-muted-foreground/70 leading-relaxed">
            This quick check helps keep automated traffic away.
            <br />
            Your session is remembered until you close the tab.
          </p>
        </CardContent>
      </Card>

      {/* Tiny shake animation */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  )
}
