import 'dotenv/config'
import sgMail from '@sendgrid/mail'

// Configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const TEMPLATE_ID = 'd-7d041425757f4010894a83c8c8cd7674'
const FROM_EMAIL = 'peyton@mail.untap-ai.com'
const FROM_NAME = 'Peyton at Untap AI'
const DOCUMENTS_URL = 'https://dashboard.untap-ai.com/documents'

const RECIPIENTS = [
  'Hailey@omega-gymnastics.com'
]

async function main(): Promise<void> {
  try {
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is not set. Please export it before running this script.')
    }

    sgMail.setApiKey(SENDGRID_API_KEY)

    const year = new Date().getFullYear()

    const sendPromises = RECIPIENTS.map(async (to) => {
      const msg = {
        to: { email: to },
        from: { email: FROM_EMAIL, name: FROM_NAME },
        templateId: TEMPLATE_ID,
        // Avoid noisy warnings for unused dynamic fields
        hideWarnings: true
      } as const

      try {
        await sgMail.send(msg)
        console.log(`Sent to ${to}`)
        return { to, ok: true as const }
      } catch (err: any) {
        console.error(`Failed sending to ${to}`, err?.response?.body || err?.message || err)
        return { to, ok: false as const, error: err }
      }
    })

    const results = await Promise.allSettled(sendPromises)

    const failures = results
      .map((r) => (r.status === 'fulfilled' ? r.value : r.reason))
      .filter((r: any) => !r.ok)

    if (failures.length > 0) {
      console.error(`\n${failures.length} failures out of ${RECIPIENTS.length}`)
      process.exit(1)
    } else {
      console.log(`\nAll ${RECIPIENTS.length} emails sent successfully.`)
    }
  } catch (e) {
    console.error('Fatal error running send-docs-feature-email script:', e)
    process.exit(1)
  }
}

main() 