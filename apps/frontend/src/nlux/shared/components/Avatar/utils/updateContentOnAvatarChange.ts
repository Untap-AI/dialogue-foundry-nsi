import { emptyInnerHtml } from '../../../utils/dom/emptyInnerHtml'
import { createPhotoContainerFromUrl } from './createPhotoContainerFromUrl'
import type { AvatarProps } from '../props'

export const updateContentOnAvatarChange = (
  element: HTMLElement,
  propsBefore: AvatarProps,
  propsAfter: AvatarProps
): void => {
  if (propsBefore.avatar === propsAfter.avatar) {
    return
  }

  if (
    typeof propsAfter.avatar === 'string' &&
    typeof propsBefore.avatar === 'string'
  ) {
    // When the avatar is a string, we update the photo container with the new URL
    const photoDomElement: HTMLElement | null = element.querySelector(
      '* > .nlux-comp-avatarContainer > .nlux-comp-avatarPicture'
    )

    if (photoDomElement !== null) {
      photoDomElement.style.backgroundImage = `url("${encodeURI(propsAfter.avatar)}")`
    }
  } else {
    if (typeof propsAfter.avatar === 'string') {
      // When the new avatar is a string and the old one is not —
      // we create a new photo container from the URL
      const newPhotoDomElement = createPhotoContainerFromUrl(propsAfter.avatar)
      element.replaceChildren(newPhotoDomElement)
    } else {
      // When the avatar is an HTMLElement, we clone it and append it to the persona dom
      if (propsAfter.avatar) {
        element.replaceChildren(propsAfter.avatar.cloneNode(true))
      } else {
        // If the new avatar is null, we remove the old one
        emptyInnerHtml(element)
      }
    }
  }
}
