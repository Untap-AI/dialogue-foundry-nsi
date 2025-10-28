import type { Options } from 'react-markdown';
import type React from 'react';
import { cn } from './utils';

export const components: Options['components'] = {
  p: ({ node, children, className, ...props }) => (
    <p
      className={cn('df:text-balance', className)}
      data-streamdown="paragraph"
      style={{ textWrap: 'pretty' } as React.CSSProperties}
      {...props}
    >
      {children}
    </p>
  ),
  ol: ({ node, children, className, ...props }) => (
    <ol
      className={cn('df:ml-4 df:list-outside df:list-decimal', className)}
      data-streamdown="ordered-list"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ node, children, className, ...props }) => (
    <li
      className={cn('df:py-1', className)}
      data-streamdown="list-item"
      {...props}
    >
      {children}
    </li>
  ),
  ul: ({ node, children, className, ...props }) => (
    <ul
      className={cn('df:ml-4 df:list-outside df:list-disc', className)}
      data-streamdown="unordered-list"
      {...props}
    >
      {children}
    </ul>
  ),
  hr: ({ node, className, ...props }) => (
    <hr
      className={cn('df:my-6 df:border-border', className)}
      data-streamdown="horizontal-rule"
      {...props}
    />
  ),
  strong: ({ node, children, className, ...props }) => (
    <span
      className={cn('df:font-semibold', className)}
      data-streamdown="strong"
      {...props}
    >
      {children}
    </span>
  ),
  a: ({ node, children, className, href, ...props }) => (
    <a
      className={cn('df:font-medium df:text-primary df:underline', className)}
      data-streamdown="link"
      href={href}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ node, children, className, ...props }) => (
    <h1
      className={cn('df:mt-6 df:mb-2 df:font-semibold df:text-3xl', className)}
      data-streamdown="heading-1"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ node, children, className, ...props }) => (
    <h2
      className={cn('df:mt-6 df:mb-2 df:font-semibold df:text-2xl', className)}
      data-streamdown="heading-2"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ node, children, className, ...props }) => (
    <h3
      className={cn('df:mt-6 df:mb-2 df:font-semibold df:text-xl', className)}
      data-streamdown="heading-3"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ node, children, className, ...props }) => (
    <h4
      className={cn('df:mt-6 df:mb-2 df:font-semibold df:text-lg', className)}
      data-streamdown="heading-4"
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ node, children, className, ...props }) => (
    <h5
      className={cn('df:mt-6 df:mb-2 df:font-semibold df:text-base', className)}
      data-streamdown="heading-5"
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ node, children, className, ...props }) => (
    <h6
      className={cn('df:mt-6 df:mb-2 df:font-semibold df:text-sm', className)}
      data-streamdown="heading-6"
      {...props}
    >
      {children}
    </h6>
  ),
};
