
import type { GreetingProps } from './props'

export function GreetingComponent(props: GreetingProps) {
  // Add safety checks to prevent DOM manipulation errors
  const hasValidName = props.name !== undefined && props.name !== null && props.name !== ''
  const hasValidMessage = props.message !== undefined && props.message !== null && props.message !== ''

  return (
    <div className='nlux-comp-welcomeMessage'>
      {hasValidName ? (
        <div className='nlux-comp-welcomeMessage-personaName'>{props.name}</div>
      ) : (
        <></>
      )}
      {hasValidMessage ? (
        <div className='nlux-comp-welcomeMessage-text'>{props.message}</div>
      ) : (
        <></>
      )}
    </div>
  )
}
