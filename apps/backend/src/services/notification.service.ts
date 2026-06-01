import { config } from '../config/env.ts'

export async function sendWhatsApp(to: string | undefined, body: string): Promise<void> {
  if (!to) return
  if (!config.twilio.accountSid || !config.twilio.authToken || config.isDev) {
    console.log(`[WhatsApp:${to}] ${body}`)
    return
  }

  const twilio = await import('twilio')
  const client = twilio.default(config.twilio.accountSid, config.twilio.authToken)
  await client.messages.create({
    from: config.twilio.whatsappFrom,
    to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    body,
  })
}

export async function sendWhatsAppSilent(to: string | undefined, body: string): Promise<void> {
  await sendWhatsApp(to, body)
}

export async function sendWhatsAppCritical(to: string | undefined, body: string): Promise<void> {
  await sendWhatsApp(to, body)
}

export async function sendAdminAlert(body: string): Promise<void> {
  console.error(`[AdminAlert] ${body}`)
}
