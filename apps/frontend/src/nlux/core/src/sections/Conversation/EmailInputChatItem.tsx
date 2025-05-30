import React, { useState } from 'react'

interface EmailInputChatItemProps {
  onSubmit: (email: string) => void
  subject: string
  conversationSummary: string
  loading?: boolean
  error?: string | null
  onCancel?: () => void
}

export const EmailInputChatItem: React.FC<EmailInputChatItemProps> = ({
  onSubmit,
  subject,
  conversationSummary,
  loading = false,
  error = null,
  onCancel
}) => {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (isValidEmail(email)) {
      onSubmit(email)
    }
  }

  return (
    <div className="flex w-full justify-start mb-2">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 max-w-md shadow border border-gray-200 dark:border-gray-700">
        <div className="mb-2 text-sm text-gray-700 dark:text-gray-200">
          <span className="font-semibold">{subject}</span>
          <div className="text-xs text-gray-500 mt-1">{conversationSummary}</div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label htmlFor="email-input" className="text-xs text-gray-600 dark:text-gray-300">
            Your email address
          </label>
          <input
            id="email-input"
            type="email"
            className="rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            required
            onBlur={() => setTouched(true)}
          />
          {touched && !isValidEmail(email) && (
            <div className="text-xs text-red-500">Please enter a valid email address.</div>
          )}
          {error && <div className="text-xs text-red-500">{error}</div>}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
              disabled={loading || !isValidEmail(email)}
            >
              {loading ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-4 w-4 mr-1 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Email'
              )}
            </button>
            {onCancel && (
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmailInputChatItem 