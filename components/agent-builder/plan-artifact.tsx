'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X, Edit2, Sparkles, Clock, AlertCircle } from 'lucide-react'
import type { AgentPlanArtifact } from '@/lib/types/artifact'

interface PlanArtifactProps {
  plan: AgentPlanArtifact
  onApprove: () => void
  onReject: (feedback?: string) => void
  isProcessing?: boolean
}

export function PlanArtifact({ plan, onApprove, onReject, isProcessing = false }: PlanArtifactProps) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState('')

  const handleReject = () => {
    if (feedback.trim()) {
      onReject(feedback)
      setFeedback('')
      setShowFeedback(false)
    } else {
      setShowFeedback(true)
    }
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{plan.title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Review this plan before I start building
              </p>
            </div>
          </div>
          {plan.estimatedBuildTime && (
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {plan.estimatedBuildTime}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Agent Overview */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Agent Overview</h3>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium text-foreground">{plan.agentName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          </div>
        </div>

        {/* Capabilities */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">What it will do</h3>
          <ul className="space-y-2">
            {plan.capabilities.map((capability, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span className="text-foreground">{capability}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Workflow Steps */}
        {plan.workflow.steps.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Workflow</h3>
            <div className="space-y-2">
              {plan.workflow.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-start gap-3 rounded-lg border border-border/50 bg-background p-3"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Limitations */}
        {plan.limitations.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Limitations
            </h3>
            <ul className="space-y-2">
              {plan.limitations.map((limitation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span className="text-muted-foreground">{limitation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feedback Input (shown when rejecting) */}
        {showFeedback && (
          <div className="rounded-lg border border-border bg-background p-4">
            <label className="mb-2 block text-sm font-medium text-foreground">
              What would you like to change?
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="E.g., 'Focus on LinkedIn instead of Reddit' or 'Add email notifications'"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              autoFocus
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 border-t border-border/50 pt-6">
          {!showFeedback ? (
            <>
              <Button
                onClick={onApprove}
                disabled={isProcessing}
                className="flex-1"
                size="lg"
              >
                <Check className="mr-2 h-4 w-4" />
                {isProcessing ? 'Starting build...' : 'Approve & Build'}
              </Button>
              <Button
                onClick={() => setShowFeedback(true)}
                disabled={isProcessing}
                variant="outline"
                size="lg"
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Request Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleReject}
                disabled={!feedback.trim() || isProcessing}
                className="flex-1"
                size="lg"
              >
                Submit Feedback
              </Button>
              <Button
                onClick={() => {
                  setShowFeedback(false)
                  setFeedback('')
                }}
                disabled={isProcessing}
                variant="ghost"
                size="lg"
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
