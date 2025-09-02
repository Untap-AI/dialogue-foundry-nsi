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
  <div className="relative">
    {/* Subtle fade at the right edge to indicate more content */}
    <div className="absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-background/80 to-transparent z-10 pointer-events-none" />
    
    <ScrollArea className={cn("w-full overflow-x-auto whitespace-nowrap", scrollAreaClassName)} type="always" {...props}>
      <div className={cn('flex w-max flex-nowrap items-center gap-3 px-1 py-1 pr-6', className)}>
        {children}
      </div>
      <ScrollBar 
        className="h-1.5 mb-1" 
        orientation="horizontal"
        thumbClassName="bg-primary rounded-[2px] hover:bg-primary/80 transition-colors"
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
        'cursor-pointer relative overflow-hidden',
        'min-w-fit max-w-[140px] min-h-[3rem]',
        
        // Enhanced theme-aware styling
        'bg-gradient-to-r from-white to-gray-50/80',
        'border border-gray-200/80 hover:border-primary/30',
        'text-gray-700 hover:text-primary',
        'shadow-sm hover:shadow-md',
        
        // Typography and spacing - updated for multiline
        'px-4 py-1 text-sm font-medium leading-snug',
        'rounded-xl',
        
        // Smooth transitions and interactions
        'transition-all duration-300 ease-out',
        'hover:scale-[1.02] active:scale-[0.98]',
        'hover:-translate-y-0.5',
        
        // Subtle backdrop effect
        'backdrop-blur-sm',
        
        // Focus states
        'focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1',
        'whitespace-normal',
        
        className
      )}
      onClick={handleClick}
      size={size}
      type="button"
      variant="ghost"
      {...props}
    >
      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
      
      {/* Content */}
      <span className="relative z-10 text-center block leading-tight max-w-[200px]">
        {children || suggestion}
      </span>
    </Button>
  );
};
