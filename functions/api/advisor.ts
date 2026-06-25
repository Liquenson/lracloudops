import { LRA_SYSTEM_PROMPT } from '../../src/lib/advisor-prompt'

interface Env {
  ANTHROPIC_API_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const apiKey = env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let messages: { role: string; content: string }[]
  try {
    const body = await request.json() as { messages: { role: string; content: string }[] }
    messages = body.messages ?? []
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: LRA_SYSTEM_PROMPT,
      messages: messages.slice(-10),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return new Response(
      JSON.stringify({ error: `Anthropic error: ${response.status}`, detail: err }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const data = await response.json() as { content: { text: string }[] }
  return new Response(
    JSON.stringify({ message: data.content?.[0]?.text ?? '' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
