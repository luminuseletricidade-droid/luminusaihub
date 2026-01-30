import { useEffect, useRef, useCallback } from 'react';

interface UseAutoResizeTextareaOptions {
  minHeight?: number;
  maxHeight?: number;
  dependencies?: any[];
}

export const useAutoResizeTextarea = (
  value: string,
  options: UseAutoResizeTextareaOptions = {}
) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { minHeight = 80, maxHeight = 300, dependencies = [] } = options;

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    // Apply new height
    textarea.style.height = `${newHeight}px`;
  }, [minHeight, maxHeight]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight, ...dependencies]);

  return {
    textareaRef,
    adjustHeight
  };
};