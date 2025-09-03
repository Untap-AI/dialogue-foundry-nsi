'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo, useEffect, useRef } from 'react';
import { Streamdown } from '@/components/streamdown';

type ResponseProps = ComponentProps<typeof Streamdown> & {
  messageId?: string;
  onLinkClick?: (url: string, linkText?: string, messageId?: string) => Promise<void>;
};

// Custom link component for Streamdown
const CustomLink = ({ node, children, className, href, ...props }: any) => (
  <a
    className={cn(
      'df:font-medium df:text-primary df:underline df:break-words df:break-all df:hyphens-auto df:inline-block df:max-w-full',
      className
    )}
    data-streamdown="link"
    href={href}
    rel="noreferrer"
    {...props}
    target="_self"
  >
    {children}
  </a>
);

export const Response = memo(
  ({ className, messageId, onLinkClick, ...props }: ResponseProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Set up link click tracking
    useEffect(() => {
      const container = containerRef.current;
      if (!container || !onLinkClick) return;

      const handleLinkClick = async (event: Event) => {
        const target = event.target as HTMLElement;
        
        // Find the closest anchor tag
        const link = target.closest('a');
        if (!link) return;

        // Get link details
        const url = link.href;
        const linkText = link.textContent?.trim() || link.title || url;

        // Record the click
        try {
          await onLinkClick(url, linkText, messageId);
        } catch (error) {
          console.warn('Failed to record link click:', error);
        }
      };

      // Add click listener to the container
      container.addEventListener('click', handleLinkClick);

      // Cleanup
      return () => {
        container.removeEventListener('click', handleLinkClick);
      };
    }, [onLinkClick, messageId]);

    return (
      <div ref={containerRef}>
        <Streamdown
          className={cn(
            'df:size-full df:[&>*:first-child]:mt-0 df:[&>*:last-child]:mb-0',
            className
          )}
          components={{
            a: CustomLink,
          }}
          {...props}
        />
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.children === nextProps.children && 
           prevProps.messageId === nextProps.messageId &&
           prevProps.onLinkClick === nextProps.onLinkClick
  }
);

Response.displayName = 'Response';
