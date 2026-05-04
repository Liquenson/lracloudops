export const prerender = false

export async function POST({ request }: { request: Request }) {
  const data = await request.formData()
  const nombre = data.get('nombre')?.toString().trim()
  const email = data.get('email')?.toString().trim()
  const mensaje = data.get('mensaje')?.toString().trim()

  if (!nombre || !email || !mensaje) {
    return new Response(JSON.stringify({ error: 'Todos los campos son obligatorios' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const apiKey = import.meta.env.RESEND_API_KEY

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'LRA Cloud Operations <hola@lracloudops.com>',
      to: 'liquenson.cloud@gmail.com',
      subject: `Nuevo mensaje de ${nombre}`,
      html: `<h2>Nuevo mensaje desde lracloudops.com</h2><p><strong>Nombre:</strong> ${nombre}</p><p><strong>Email:</strong> ${email}</p><p><strong>Mensaje:</strong></p><p>${mensaje}</p>`
    })
  })

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'Error al enviar' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
