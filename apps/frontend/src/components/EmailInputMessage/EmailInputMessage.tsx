import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface EmailInputMessageProps {
  onSubmit: (email: string) => Promise<void>
  className?: string
}

type EmailInputState = 'idle' | 'loading' | 'success' | 'error'

export const EmailInputMessage: React.FC<EmailInputMessageProps> = ({
  onSubmit,
  className
}) => {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<EmailInputState>('idle')
  const [isVisible, setIsVisible] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [submitError, setSubmitError] = useState('')

  // Trigger fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
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
      await onSubmit(email)
      setState('success')
    } catch (error) {
      setState('error')
      setSubmitError('Failed to send email. Please try again.')
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
    <div 
      className={cn(
        'df:p-4 df:rounded-lg df:border df:bg-card df:transition-all df:duration-300',
        'df:border-primary/20 df:bg-primary/5 df:mt-3',
        isVisible ? 'df:opacity-100 df:translate-y-0' : 'df:opacity-0 df:translate-y-2',
        className
      )}
      data-dialogue-foundry-id="email-input-message"
    >
      {state === 'success' ? (
        <div className="df:flex df:items-start df:space-x-3">
          <div className="df:size-6 df:rounded-full df:bg-green-100 df:flex df:items-center df:justify-center df:flex-shrink-0 df:mt-0.5">
            <svg className="df:size-4 df:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="df:flex-1">
            <h4 className="df:text-sm df:font-medium df:text-foreground df:mb-1">Perfect! We've got your email</h4>
                          <p className="df:text-xs df:text-muted-foreground">
                We'll reach out to you shortly at <span className="df:font-medium df:break-all">{email}</span>
              </p>
          </div>
        </div>
      ) : (
        <div className="df:space-y-3">
          <h4 className="df:text-sm df:font-medium df:text-foreground">Let's get you connected</h4>
          
          <form onSubmit={handleSubmit} className="df:space-y-2">
            <div className="df:flex df:space-x-2">
              <div className="df:flex-1">
                <Input
                  type="email"
                  className={cn(
                    validationError && 'df:border-destructive df:focus:ring-destructive df:focus:border-destructive'
                  )}
                  placeholder="your@email.com"
                  value={email}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  onBlur={handleBlur}
                  autoComplete="email"
                  disabled={isFormDisabled}
                  required
                />
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={!isValidEmail(email) || isFormDisabled}
                aria-label={state === 'loading' ? 'Sending email...' : 'Send email'}
              >
                {state === 'loading' ? (
                  <>
                    <svg className="df:size-4 df:animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="df:opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="df:opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </>
                ) : (
                    <svg className="df:size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                )}
              </Button>
            </div>
            
            {/* Show validation error */}
            {validationError && (
              <p className="df:text-xs df:text-destructive">{validationError}</p>
            )}
            
            {/* Show submit error with retry option */}
            {state === 'error' && submitError && (
              <div className="df:flex df:items-center df:justify-between df:p-2 df:rounded-md df:bg-destructive/10 df:border df:border-destructive/20">
                <p className="df:text-xs df:text-destructive">{submitError}</p>
                <Button
                  type="button"
                  onClick={handleRetry}
                  variant="ghost"
                  size="sm"
                  className="df:h-auto df:px-2 df:py-1 df:text-xs"
                >
                  Try again
                </Button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
