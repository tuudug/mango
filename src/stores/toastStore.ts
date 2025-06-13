import { create } from 'zustand';
import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'success' | 'error' | 'info' | 'warning' | 'destructive';
}

interface ToastState {
  showToast: (options: ToastOptions) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  showToast: (options: ToastOptions) => {
    const { title, description, variant: inputVariant = 'info' } = options;
    const sonnerOptions = description ? { description } : {};
    const variant = inputVariant === 'destructive' ? 'error' : inputVariant;

    switch (variant) {
      case 'success':
        sonnerToast.success(title, sonnerOptions);
        break;
      case 'error':
        sonnerToast.error(title, sonnerOptions);
        break;
      case 'warning':
        sonnerToast.warning(title, sonnerOptions);
        break;
      case 'info':
      default:
        sonnerToast.info(title, sonnerOptions);
        break;
    }
  },
}));
