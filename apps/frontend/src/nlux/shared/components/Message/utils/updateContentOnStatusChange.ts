import { emptyInnerHtml } from '../../../utils/dom/emptyInnerHtml'
import { statusClassName } from './applyNewStatusClassName'
import type { MessageProps } from '../props'

export const updateContentOnStatusChange = (
  element: HTMLElement,
  _: MessageProps,
  propsAfter: MessageProps
) => {
  const newStatus = propsAfter.status
  if (newStatus === 'streaming') {
    return
  }

  if (newStatus === 'complete') {
    const innerHtml = propsAfter.message ? propsAfter.message : ''
    const textNode = document.createTextNode(innerHtml)
    element.classList.add(statusClassName[newStatus])
    emptyInnerHtml(element)
    element.append(textNode)

    return
  }
}
