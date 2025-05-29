import { createPhotoContainerFromUrl } from './utils/createPhotoContainerFromUrl'
import type { DomCreator } from '../../types/dom/DomCreator'
import type { AvatarProps } from './props'

export const className = 'nlux-comp-avatar'

export const createAvatarDom: DomCreator<AvatarProps> = (
  props
): HTMLElement => {
  const element = document.createElement('div')
  element.classList.add(className)

  if (!props.avatar && !props.name) {
    return element
  }

  if (props.name) {
    element.title = props.name
  }

  // When the avatar is an HTMLElement, we clone it and append it to the persona dom
  // without any further processing!
  if (props.avatar && props.avatar instanceof HTMLElement) {
    element.append(props.avatar.cloneNode(true))
    return element
  }

  // Alternatively, treat the avatar as a string representing a URL of the photo to
  // be loaded and render the photo accordingly.
  element.append(createPhotoContainerFromUrl(props.avatar as string))
  return element
}
