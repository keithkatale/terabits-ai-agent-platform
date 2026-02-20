import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RuntimeChat } from '@/components/runtime/runtime-chat'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('name, description')
    .eq('deploy_slug', slug)
    .eq('is_deployed', true)
    .single()

  if (!agent) return { title: 'Agent Not Found' }

  return {
    title: `${agent.name} | Terabits`,
    description: agent.description || `Chat with ${agent.name}`,
  }
}

export default async function RuntimePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, description, category, deploy_slug')
    .eq('deploy_slug', slug)
    .eq('is_deployed', true)
    .single()

  if (!agent) {
    notFound()
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-sm font-bold text-primary">T</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">{agent.name}</h1>
            {agent.description && (
              <p className="text-xs text-muted-foreground">{agent.description}</p>
            )}
          </div>
        </div>
      </header>

      <RuntimeChat agentId={agent.id} agentName={agent.name} />
    </main>
  )
}
