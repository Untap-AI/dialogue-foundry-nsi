import {
  className as compGreetingClassName,
  personaNameClassName as compGreetingPersonaNameClassName
} from '../../../../shared/components/Greeting/create'
import { greetingTextClassName as compGreetingTextClassName } from '../../../../shared/components/Greeting/utils/updateGreetingText'
import type { GreetingProps } from './props'

export function GreetingComponent(props: GreetingProps) {
  // Add safety checks to prevent DOM manipulation errors
  const hasValidName = props.name !== undefined && props.name !== null && props.name !== ''
  const hasValidMessage = props.message !== undefined && props.message !== null && props.message !== ''

  return (
    <div className={compGreetingClassName}>
      {hasValidName ? (
        <div className={compGreetingPersonaNameClassName}>{props.name}</div>
      ) : (
        <></>
      )}
      {hasValidMessage ? (
        <div className={compGreetingTextClassName}>{props.message}</div>
      ) : (
        <></>
      )}
    </div>
  )
}
