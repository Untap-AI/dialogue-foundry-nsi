import { useEffect, useMemo } from 'react'
import { warnOnce } from '../../../../shared/utils/warn'
import { ConversationStarters } from '../../components/ConversationStarters/ConversationStarters'
import {
  GreetingComponent,
} from '../../components/Greeting/GreetingComp'
import type { LaunchPadProps } from './props'

export function LaunchPad<AiMsg>(props: LaunchPadProps<AiMsg>) {
  const { segments, personaOptions, conversationOptions, userDefinedGreeting } =
    props

    console.log(props)

  const hasMessages = useMemo(
    () => segments.some(segment => segment.items.length > 0),
    [segments]
  )

  const showGreetingFromPersonaOptions =
    !userDefinedGreeting &&
    !hasMessages &&
    personaOptions?.assistant !== undefined &&
    conversationOptions?.showWelcomeMessage !== false

  const customWelcomeMessageVisible = useMemo(
    () =>
      segments.length === 1 &&
      segments[0].items.length === 1 &&
      segments[0].items[0].participantRole === 'assistant',
    [segments]
  )

  const showConversationStarters = useMemo(
    () =>
      ((!hasMessages || customWelcomeMessageVisible) &&
        (conversationOptions?.conversationStarters?.length ?? 0) > 0),
    [hasMessages, conversationOptions?.conversationStarters, customWelcomeMessageVisible]
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

  return (
    <>
    {showGreetingFromPersonaOptions && (
        <GreetingComponent
          name={personaOptions?.assistant?.name}
          message={personaOptions?.assistant?.tagline}
        />
      )}
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
