// Agent execution API endpoint
// POST /api/agents/[id]/execute

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/execution-engine'
import type { ExecutionEvent } from '@/lib/execution-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Execute an agent with given input
 * Supports both regular JSON response and Server-Sent Events streaming
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { input, stream = false } = body

    if (!input || typeof input !== 'object') {
      return NextResponse.json(
        { error: 'Invalid input: must be an object' },
        { status: 400 }
      )
    }

    // Check if streaming is requested
    if (stream) {
      return handleStreamingExecution(params.id, user.id, input)
    }

    // Regular execution (wait for completion)
    const result = await executeAgent({
      agentId: params.id,
      userId: user.id,
      input,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Execution error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Execution failed',
      },
      { status: 500 }
    )
  }
}

/**
 * Handle streaming execution with Server-Sent Events
 */
function handleStreamingExecution(
  agentId: string,
  userId: string,
  input: Record<string, unknown>
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Execute agent with streaming callback
        const result = await executeAgent(
          {
            agentId,
            userId,
            input,
          },
          (event: ExecutionEvent) => {
            // Send event as SSE
            const data = JSON.stringify(event)
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        )

        // Send final result
        const finalEvent = {
          type: 'complete',
          result,
          timestamp: new Date(),
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(finalEvent)}\n\n`)
        )

        controller.close()
      } catch (error) {
        const errorEvent = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/**
 * Get execution status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get execution ID from query params
    const { searchParams } = new URL(request.url)
    const executionId = searchParams.get('executionId')

    if (!executionId) {
      // Return recent executions for this agent
      const { data: executions, error } = await supabase
        .from('agent_executions')
        .select('*')
        .eq('agent_id', params.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        throw error
      }

      return NextResponse.json({ executions })
    }

    // Get specific execution
    const { data: execution, error } = await supabase
      .from('agent_executions')
      .select('*')
      .eq('id', executionId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ execution })
  } catch (error) {
    console.error('Get execution error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get execution',
      },
      { status: 500 }
    )
  }
}
