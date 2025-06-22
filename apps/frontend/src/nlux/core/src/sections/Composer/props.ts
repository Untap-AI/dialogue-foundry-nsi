import type { ComposerStatus } from '../../../../shared/components/Composer/props'

export type ComposerProps = {
  // State and option props
  status: ComposerStatus
  prompt?: string
  placeholder?: string
  autoFocus?: boolean
  hideStopButton?: boolean

  hasValidInput?: boolean
  submitShortcut?: 'Enter' | 'CommandEnter'

  // Event Handlers
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}
