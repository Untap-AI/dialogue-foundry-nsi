import sgMail from '@sendgrid/mail'
import dotenv from 'dotenv'
import { getChatConfigByCompanyId } from '../db/chat-configs'
import { logger } from '../lib/logger'
import { cacheService } from './cache-service'
import type { MailDataRequired } from '@sendgrid/mail'

dotenv.config()

// Get SendGrid API key from environment variables
const API_KEY = process.env.SENDGRID_API_KEY
const DEFAULT_TEMPLATE_ID = process.env.DEFAULT_SENDGRID_TEMPLATE_ID

if (!API_KEY) {
  throw new Error(
    'SENDGRID_API_KEY is not set in environment variables. Email functionality will not work.'
  )
} else {
  sgMail.setApiKey(API_KEY)
}

if (!DEFAULT_TEMPLATE_ID) {
  throw new Error(
    'DEFAULT_SENDGRID_TEMPLATE_ID is not set in environment variables. Email functionality will not work.'
  )
}

// TODO: Create zod schema for email data and use in function tool
export interface EmailData {
  userEmail: string
  subject: string
  conversationSummary: string
  recentMessages: {
    role: string
    content: string
  }[]
  companyId: string
}

/**
 * Sends an email using SendGrid template
 * @param emailData The data needed to send the email
 * @returns Promise that resolves when the email is sent
 */
export const sendInquiryEmail = async (
  emailData: EmailData
): Promise<boolean> => {
  try {
    // Get company configuration to check for custom template ID
    const companyConfig =
      cacheService.getChatConfig(emailData.companyId) ??
      (await getChatConfigByCompanyId(emailData.companyId))

    if (!companyConfig) {
      logger.error(
        `No company config found for company ID: ${emailData.companyId}`,
        {
          companyId: emailData.companyId,
          service: 'sendgrid-service'
        }
      )
      return false
    }

    // Use company template ID if available, otherwise use default
    const templateId =
      companyConfig?.sendgrid_template_id || DEFAULT_TEMPLATE_ID

    // Format recent messages for better readability in the email
    const formattedMessages = emailData.recentMessages.map(msg => ({
      role: msg.role.charAt(0).toUpperCase() + msg.role.slice(1), // Capitalize role
      content: msg.content
    }))

    // Convert messages to presentable format for email
    const chatHistory = formattedMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n')

    // Define support email - required for SendGrid
    const supportEmail = companyConfig.support_email

    // This should never happen, but is required for type safety
    if (!supportEmail) {
      logger.error(
        `No support email found for company ID: ${emailData.companyId}`,
        {
          companyId: emailData.companyId,
          service: 'sendgrid-service'
        }
      )
      return false
    }

    // Create the email with proper types
    const msg = {
      to: [{ email: supportEmail }],
      from: {
        email: 'no-reply@untap-ai.com',
        name: 'Untap AI'
      },
      templateId,
      dynamicTemplateData: {
        subject: emailData.subject,
        conversationSummary: emailData.conversationSummary,
        chatHistory,
        userEmail: emailData.userEmail,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      },
      hideWarnings: true
    } as const satisfies MailDataRequired

    // Send the email
    await sgMail.send(msg)
    
    return true
  } catch (error) {
    logger.error('Error sending email', {
      error: error as Error,
      userEmail: emailData.userEmail,
      companyId: emailData.companyId,
      service: 'sendgrid-service'
    })
    if (error.response) {
      logger.error('SendGrid API response error details', {
        responseBody: error.response.body,
        service: 'sendgrid-service'
      })
    }
    return false
  }
}
