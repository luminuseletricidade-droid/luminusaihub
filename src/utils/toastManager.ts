import { toast as sonnerToast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'default' | 'destructive';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastMessage {
  title?: string;
  description?: string;
  variant?: ToastType;
  timestamp: number;
}

class ToastManager {
  private static instance: ToastManager;
  private recentToasts: Map<string, ToastMessage> = new Map();
  private duplicateThreshold = 1000; // 1 second threshold for duplicate detection

  private constructor() {}

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  private generateToastKey(options: ToastOptions): string {
    return `${options.title || ''}-${options.description || ''}-${options.variant || 'default'}`;
  }

  private isDuplicate(options: ToastOptions): boolean {
    const key = this.generateToastKey(options);
    const existing = this.recentToasts.get(key);

    if (!existing) {
      return false;
    }

    const now = Date.now();
    const timeDiff = now - existing.timestamp;

    // If the same toast was shown within the threshold, it's a duplicate
    if (timeDiff < this.duplicateThreshold) {
      return true;
    }

    // Clean up old entries
    if (timeDiff > 5000) {
      this.recentToasts.delete(key);
    }

    return false;
  }

  private recordToast(options: ToastOptions): void {
    const key = this.generateToastKey(options);
    this.recentToasts.set(key, {
      title: options.title,
      description: options.description,
      variant: options.variant,
      timestamp: Date.now()
    });

    // Clean up old entries periodically
    if (this.recentToasts.size > 50) {
      const now = Date.now();
      for (const [k, v] of this.recentToasts.entries()) {
        if (now - v.timestamp > 10000) {
          this.recentToasts.delete(k);
        }
      }
    }
  }

  show(options: ToastOptions): void {
    // Check for duplicates
    if (this.isDuplicate(options)) {
      console.log('[ToastManager] Duplicate toast prevented:', options);
      return;
    }

    // Record this toast
    this.recordToast(options);

    // Map variant to sonner toast types
    const { title, description, variant = 'default', duration, action } = options;

    // Create the message content
    const message = title || description || '';
    const descriptionText = title && description ? description : undefined;

    // Show the toast based on variant
    switch (variant) {
      case 'success':
        sonnerToast.success(message, {
          description: descriptionText,
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick
          } : undefined
        });
        break;

      case 'error':
      case 'destructive':
        sonnerToast.error(message, {
          description: descriptionText,
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick
          } : undefined
        });
        break;

      case 'warning':
        sonnerToast.warning(message, {
          description: descriptionText,
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick
          } : undefined
        });
        break;

      case 'info':
        sonnerToast.info(message, {
          description: descriptionText,
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick
          } : undefined
        });
        break;

      default:
        sonnerToast(message, {
          description: descriptionText,
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick
          } : undefined
        });
        break;
    }
  }

  clearRecentToasts(): void {
    this.recentToasts.clear();
  }

  setDuplicateThreshold(milliseconds: number): void {
    this.duplicateThreshold = milliseconds;
  }
}

// Export singleton instance
export const toastManager = ToastManager.getInstance();

// Export a wrapper that matches the shadcn toast interface
export const toast = (options: ToastOptions) => {
  toastManager.show(options);
};

// Export utility functions
export const showSuccessToast = (title: string, description?: string) => {
  toastManager.show({ title, description, variant: 'success' });
};

export const showErrorToast = (title: string, description?: string) => {
  toastManager.show({ title, description, variant: 'error' });
};

export const showInfoToast = (title: string, description?: string) => {
  toastManager.show({ title, description, variant: 'info' });
};

export const showWarningToast = (title: string, description?: string) => {
  toastManager.show({ title, description, variant: 'warning' });
};