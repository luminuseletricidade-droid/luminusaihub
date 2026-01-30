import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
  maxHeight?: number;
  dependencies?: any[];
}

const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, minHeight = 80, maxHeight = 300, dependencies = [], ...props }, ref) => {
    const { textareaRef, adjustHeight } = useAutoResizeTextarea(
      props.value as string || '',
      { minHeight, maxHeight, dependencies }
    );

    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current!);

    return (
      <textarea
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        ref={textareaRef}
        onInput={adjustHeight}
        {...props}
      />
    );
  }
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };
