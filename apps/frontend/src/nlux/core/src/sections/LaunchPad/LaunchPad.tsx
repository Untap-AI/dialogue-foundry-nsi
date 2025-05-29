import { useEffect, useMemo } from 'react'
import { warnOnce } from '../../../../shared/utils/warn'
import { ConversationStarters } from '../../components/ConversationStarters/ConversationStarters'
import { DefaultGreetingComp } from '../../components/DefaultGreeting/DefaultGreetingComp'
import {
  GreetingComp,
  GreetingContainer
} from '../../components/Greeting/GreetingComp'
import type { LaunchPadProps } from './props'

export function LaunchPad<AiMsg>(props: LaunchPadProps<AiMsg>) {
  const { segments, personaOptions, conversationOptions, userDefinedGreeting } =
    props

  const hasMessages = useMemo(
    () => segments.some(segment => segment.items.length > 0),
    [segments]
  )
  const showDefaultGreeting = useMemo(
    () =>
      !userDefinedGreeting && // Only show the default greeting if the user has not provided a custom greeting
      !hasMessages &&
      personaOptions?.assistant === undefined &&
      conversationOptions?.showWelcomeMessage !== false,
    [
      hasMessages,
      personaOptions?.assistant,
      conversationOptions?.showWelcomeMessage,
      userDefinedGreeting
    ]
  )

  const showGreetingFromPersonaOptions =
    !userDefinedGreeting &&
    !hasMessages &&
    personaOptions?.assistant !== undefined &&
    conversationOptions?.showWelcomeMessage !== false

  const showConversationStarters = useMemo(
    () =>
      !hasMessages &&
      conversationOptions?.conversationStarters &&
      conversationOptions?.conversationStarters.length > 0,
    [hasMessages, conversationOptions?.conversationStarters]
  )

  const showUserDefinedGreeting = useMemo(
    () =>
      userDefinedGreeting !== undefined &&
      conversationOptions?.showWelcomeMessage !== false,
    [userDefinedGreeting, conversationOptions?.showWelcomeMessage]
  )

  useEffect(() => {
    if (
      userDefinedGreeting &&
      conversationOptions?.showWelcomeMessage === false
    ) {
      warnOnce(
        'Configuration conflict: The greeting UI override provided via <AiChatUI.Greeting> will not be shown ' +
          'because conversationOptions.showWelcomeMessage is set to false.'
      )
    }
  }, [conversationOptions?.showWelcomeMessage, userDefinedGreeting])

  const showEmptyGreeting =
    !showDefaultGreeting &&
    !showGreetingFromPersonaOptions &&
    !showUserDefinedGreeting &&
    !hasMessages

  return (
    <>
      {showDefaultGreeting && <DefaultGreetingComp />}
      {showGreetingFromPersonaOptions && (
        <GreetingComp
          name={personaOptions?.assistant?.name}
          avatar={personaOptions?.assistant?.avatar}
          message={personaOptions?.assistant?.tagline}
        />
      )}
      {showUserDefinedGreeting && (
        <GreetingContainer>{userDefinedGreeting}</GreetingContainer>
      )}
      {showEmptyGreeting && <GreetingContainer>{undefined}</GreetingContainer>}
      <div className="nlux-conversationStarters-container">
        {showConversationStarters && (
          <ConversationStarters
            items={conversationOptions?.conversationStarters ?? []}
            onConversationStarterSelected={props.onConversationStarterSelected}
          />
        )}
      </div>
    </>
  )
}
