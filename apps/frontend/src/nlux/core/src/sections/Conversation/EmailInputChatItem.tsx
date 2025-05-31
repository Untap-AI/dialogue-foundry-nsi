import React, { useState } from 'react'
import { EmailSubmittedCallback } from '../../../../shared/types/chatSegment/chatSegmentEvents'

interface EmailInputChatItemProps {
  onSubmit: EmailSubmittedCallback
}

export const EmailInputChatItem: React.FC<EmailInputChatItemProps> = ({
  onSubmit
}) => {
  const [email, setEmail] = useState('')

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValidEmail(email)) {
      onSubmit(email)
    }
  }

  return (
    <div className="flex w-full justify-start mb-2">
      <input
        id="email-input"
        type="email"
        className="rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        placeholder="you@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
        disabled={!isValidEmail(email)}
        onClick={handleSubmit}
      >
        Send
      </button>
    </div>
  )
}