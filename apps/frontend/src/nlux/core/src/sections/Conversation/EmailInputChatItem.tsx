import React, { useState } from 'react'
import { EmailSubmittedCallback } from '../../../../shared/types/chatSegment/chatSegmentEvents'
import './EmailInputChatItem.css'
import { SendIconComp } from '../../components/SendIcon/SendIconComp'

interface EmailInputChatItemProps {
  onSubmit: EmailSubmittedCallback
}

export const EmailInputChatItem: React.FC<EmailInputChatItemProps> = ({
  onSubmit
}) => {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValidEmail(email)) {
      onSubmit(email)
      setSubmitted(true)
    }
  }

  return (
      <div className="email-input-chat-item-container">
      {submitted ? (
        <div className="email-input-submitted">
          Email submitted: {email}
        </div>
      ) : (
        <>
      <input
        id="email-input"
        type="email"
        className="email-input"
        placeholder="you@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <button
          tabIndex={0}
          disabled={!isValidEmail(email)}
          onClick={handleSubmit}
          aria-label="Send"
          className="email-send-button"
        >
          <SendIconComp />
      </button>
      </>
    )}
    </div>
  )
}