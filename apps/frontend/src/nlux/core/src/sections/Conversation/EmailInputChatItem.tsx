import React, { useState, useEffect } from 'react'
import { EmailSubmittedCallback } from '../../../../shared/types/chatSegment/chatSegmentEvents'
import './EmailInputChatItem.css'
import { EmailSendIcon } from './EmailSendIcon'

interface EmailInputChatItemProps {
  onSubmit: EmailSubmittedCallback
}

// Define the possible states for the email input
type EmailInputState = 'idle' | 'loading' | 'success' | 'error'

export const EmailInputChatItem: React.FC<EmailInputChatItemProps> = ({
  onSubmit
}) => {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<EmailInputState>('idle')
  const [isVisible, setIsVisible] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [submitError, setSubmitError] = useState('')

  // Trigger fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValidEmail(email)) {
      setValidationError('Please enter a valid email address')
      return
    }

    // Clear any previous errors
    setValidationError('')
    setSubmitError('')
    
    // Set loading state
    setState('loading')

    try {
      // Call the async onSubmit callback
      const result = await onSubmit(email)
      
      if (result.success) {
        setState('success')
      } else {
        setState('error')
        setSubmitError(result.error || 'Failed to send email. Please try again.')
      }
    } catch (error) {
      setState('error')
      setSubmitError('An unexpected error occurred. Please try again.')
      console.error('Email submission error:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValidEmail(email) && state !== 'loading') {
      handleSubmit(e)
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value && !isValidEmail(e.target.value)) {
      setValidationError('Please enter a valid email address')
    } else {
      setValidationError('')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setValidationError('')
    
    // Clear submit error when user starts typing again
    if (submitError) {
      setSubmitError('')
    }
  }

  const handleRetry = () => {
    setState('idle')
    setSubmitError('')
  }

  // Determine if form should be disabled
  const isFormDisabled = state === 'loading' || state === 'success'

  return (
    <div className={`email-input-container ${isVisible ? 'email-input-visible' : ''}`}>
      {state === 'success' ? (
        <div className="email-success-container">
          <div className="email-success-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="email-success-content">
            <h4 className="email-success-title">Perfect! We've got your email</h4>
            <p className="email-success-subtitle">
              We'll reach out to you shortly at <strong>{email}</strong>
            </p>
          </div>
        </div>
      ) : (
        <div className="email-input-form">
          <div className="email-input-header">
            <h4 className="email-input-title">Let's get you connected</h4>
            <p className="email-input-subtitle">Share your email and we'll follow up personally.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="email-input-field-container">
            <div className="email-input-wrapper">
              <input
                id="email-input"
                type="email"
                className={`email-input-field ${Boolean(validationError) ? 'email-input-error' : ''}`}
                placeholder="your@email.com"
                value={email}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                onBlur={handleBlur}
                autoComplete="email"
                disabled={isFormDisabled}
                required
              />
              <button
                type="submit"
                disabled={!isValidEmail(email) || isFormDisabled}
                className={`email-send-button ${state === 'loading' ? 'email-send-button-loading' : ''}`}
                aria-label={state === 'loading' ? 'Sending email...' : 'Send email'}
              >
                {state === 'loading' ? (
                  <div className="email-loading-spinner" />
                ) : (
                  <EmailSendIcon />
                )}
              </button>
            </div>
            
            {/* Show validation error */}
            {validationError && (
              <p className="email-error-message">{validationError}</p>
            )}
            
            {/* Show submit error with retry option */}
            {state === 'error' && submitError && (
              <div className="email-submit-error">
                <p className="email-error-message">{submitError}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="email-retry-button"
                >
                  Try again
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  )
}