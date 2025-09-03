
import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';
import type { ComponentProps, HTMLAttributes } from 'react';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage['role'];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'df:group df:flex df:w-full df:items-end df:justify-end df:gap-2 df:py-3',
      from === 'user' ? 'is-user' : 'is-assistant df:flex-row-reverse df:justify-end',
      'df:[&>div]:max-w-[80%]',
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      'df:flex df:flex-col df:gap-2 df:overflow-hidden df:rounded-lg df:px-4 df:py-3 df:text-foreground df:text-sm',
      'df:group-[.is-user]:bg-primary df:group-[.is-user]:text-primary-foreground',
      'df:group-[.is-assistant]:bg-secondary df:group-[.is-assistant]:text-foreground',
      'df:is-user:dark',
      className
    )}
    {...props}
  >
    {children}
  </div>
);