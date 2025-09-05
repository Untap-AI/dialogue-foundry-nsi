import { Button } from '@/components/ui/button';
import {
  ScrollArea,
  ScrollBar,
} from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export type SuggestionsProps = ComponentProps<typeof ScrollArea> & {
  scrollAreaClassName?: string;
};

export const Suggestions = ({
  className,
  children,
  scrollAreaClassName,
  ...props
}: SuggestionsProps) => (
  <div className="df:relative" data-dialogue-foundry-id="suggestions">
    {/* Subtle fade at the right edge to indicate more content */}
    <div className="df:absolute df:right-0 df:top-0 df:bottom-0 df:w-5 df:bg-gradient-to-l df:from-background/80 df:to-transparent df:z-10 df:pointer-events-none" />
    
    <ScrollArea 
      className={cn("df:w-full df:overflow-x-scroll df:whitespace-nowrap", scrollAreaClassName)} 
      type="always" 
      {...props}
    >
      <div className={cn('df:flex df:w-max df:min-w-full df:flex-nowrap df:items-center df:gap-3 df:py-1', className)}>
        <div className="df:flex-shrink-0 df:w-1 df:h-1" aria-hidden="true" />
        {children}
        <div className="df:flex-shrink-0 df:w-1 df:h-1" aria-hidden="true" />
      </div>
      <ScrollBar 
        className="df:h-1.5 df:mb-1" 
        orientation="horizontal"
        thumbClassName="df:bg-primary df:rounded-[2px] df:hover:bg-primary/80 df:transition-colors"
      />
    </ScrollArea>
  </div>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, 'onClick'> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
  // Analytics props
  analyticsLabel?: string;
  analyticsPosition?: number;
  onAnalyticsClick?: (label: string | undefined, position: number, prompt: string) => Promise<void>;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = 'outline',
  size = 'sm',
  children,
  analyticsLabel,
  analyticsPosition = 0,
  onAnalyticsClick,
  ...props
}: SuggestionProps) => {
  const handleClick = async () => {
    // Record analytics first
    if (onAnalyticsClick) {
      try {
        await onAnalyticsClick(analyticsLabel, analyticsPosition, suggestion);
      } catch (error) {
        console.warn('Failed to record conversation starter click:', error);
      }
    }
    
    // Then call the original onClick
    onClick?.(suggestion);
  };

  return (
    <Button
      className={cn(
        // Base styling
        'df:cursor-pointer df:relative df:overflow-hidden',
        'df:min-w-fit df:max-w-[140px] df:min-h-[48px]',
        
        // Enhanced theme-aware styling - uses lighter version of background
        'df:bg-background/50 df:hover:bg-background/70',
        'df:border df:border-border/60 df:hover:border-primary/40',
        'df:text-foreground/80 df:hover:text-primary',
        'df:shadow-sm df:hover:shadow-md',
        
        // Typography and spacing - updated for multiline
        'df:px-4 df:py-1 df:text-sm df:font-medium df:leading-snug',
        'df:rounded-xl',
        
        // Smooth transitions and interactions
        'df:transition-all df:duration-300 df:ease-out',
        'df:hover:scale-[1.02] df:active:scale-[0.98]',
        'df:hover:-translate-y-0.5',
        
        // Subtle backdrop effect
        'df:backdrop-blur-sm',
        
        // Focus states
        'df:focus-visible:ring-2 df:focus-visible:ring-primary/20 df:focus-visible:ring-offset-1',
        'df:whitespace-normal',
        
        className
      )}
      data-dialogue-foundry-id="suggestion"
      onClick={handleClick}
      size={size}
      type="button"
      variant="ghost"
      {...props}
    >
      {/* Subtle shine effect */}
      <div className="df:absolute df:inset-0 df:bg-gradient-to-r df:from-transparent df:via-background/20 df:to-transparent df:opacity-0 df:hover:opacity-100 df:transition-opacity df:duration-500 df:-skew-x-12 df:translate-x-[-100%] df:hover:translate-x-[100%] df:transition-transform df:duration-700" />
      
      {/* Content */}
      <span className="df:relative df:z-10 df:text-center df:block df:leading-tight df:max-w-[200px] df:normal-case">
        {children || suggestion}
      </span>
    </Button>
  );
};
