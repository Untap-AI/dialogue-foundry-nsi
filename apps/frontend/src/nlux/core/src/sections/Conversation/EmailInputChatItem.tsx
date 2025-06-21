import React, { useState, useEffect } from 'react'
import { EmailSubmittedCallback } from '../../../../shared/types/chatSegment/chatSegmentEvents'
import './EmailInputChatItem.css'
import { EmailSendIcon } from './EmailSendIcon'

interface EmailInputChatItemProps {
  onSubmit: EmailSubmittedCallback
}

export const EmailInputChatItem: React.FC<EmailInputChatItemProps> = ({
  onSubmit
}) => {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [error, setError] = useState('')

  // Trigger fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValidEmail(email)) {
      onSubmit(email)
      setSubmitted(true)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValidEmail(email)) {
      handleSubmit(e)
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value && !isValidEmail(e.target.value)) {
      setError('Please enter a valid email address')
    } else {
      setError('')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)

    setError('')
  }


  return (
    <div className={`email-input-container ${isVisible ? 'email-input-visible' : ''}`}>
      {submitted ? (
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
                className={`email-input-field ${Boolean(error) ? 'email-input-error' : ''}`}
                placeholder="your@email.com"
                value={email}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                onBlur={handleBlur}
                autoComplete="email"
                required
              />
              <button
                type="submit"
                disabled={!isValidEmail(email)}
                className="email-send-button"
                aria-label="Send email"
              >
                <EmailSendIcon />
              </button>
            </div>
            {error && (
              <p className="email-error-message">{error}</p>
            )}
          </form>
        </div>
      )}
    </div>
  )
}