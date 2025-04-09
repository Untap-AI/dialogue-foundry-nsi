import sgMail from '@sendgrid/mail'
import dotenv from 'dotenv'
import { getChatConfigByCompanyId } from '../db/chat-configs'
import { cacheService } from './cache-service'

dotenv.config()

// Get SendGrid API key from environment variables
const apiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.SENDGRID_FROM_EMAIL

if (!apiKey) {
  console.warn('SENDGRID_API_KEY is not set in environment variables. Email functionality will not work.')

  throw new Error('SENDGRID_API_KEY is not set in environment variables. Email functionality will not work.')
} else {
  sgMail.setApiKey(apiKey)
}

if (!fromEmail) {
  console.warn('FROM_EMAIL is not set in environment variables. Email functionality will not work.')

  throw new Error('FROM_EMAIL is not set in environment variables. Email functionality will not work.')
}

// Default SendGrid template ID to use if not specified in the company config
const DEFAULT_TEMPLATE_ID = process.env.DEFAULT_SENDGRID_TEMPLATE_ID || 'd-default-template-id'

export interface EmailData {
  userEmail: string
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
export const sendInquiryEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    // Get company configuration to check for custom template ID
    const companyConfig = cacheService.getChatConfig(emailData.companyId) ?? await getChatConfigByCompanyId(emailData.companyId)

    if (!companyConfig) {
      return false
    }
    
    // Use company template ID if available, otherwise use default
    const templateId = companyConfig?.sendgrid_template_id || DEFAULT_TEMPLATE_ID
    
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
      return false
    }
    
    // Create recipients array with proper types
    const recipients = []
    
    // Add support email
    recipients.push({ email: supportEmail, name: 'Support Team' })
    
    // Add user email as CC if provided
    // TODO: Should we do this?
    if (emailData.userEmail) {
      recipients.push({ email: emailData.userEmail, name: 'User' })
    }
    
    // Create the email with proper types
    const msg = {
      to: recipients,
      from: {
        email: fromEmail,
        // TODO: What should this be?
        name: 'Dialogue Foundry'
      },
      templateId,
      dynamicTemplateData: {
        conversationSummary: emailData.conversationSummary,
        chatHistory,
        userEmail: emailData.userEmail,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      }
    }
    
    // Send the email
    await sgMail.send(msg)
    console.log(`Email sent successfully to support team for ${emailData.companyId}`)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
} 