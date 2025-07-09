import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface CapturedError {
  id: string;
  error: Error;
  errorInfo?: React.ErrorInfo;
  timestamp: Date;
}

interface ErrorStoreState {
  errors: CapturedError[];
  isPopupOpen: boolean;
  addError: (error: Error, errorInfo?: React.ErrorInfo) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  showAllErrors: () => void;
  hideAllErrors: () => void;
}

const useErrorStore = create<ErrorStoreState>()(
  devtools(
    (set) => ({
      errors: [],
      isPopupOpen: false,
      addError: (error, errorInfo) =>
        set((state) => ({
          errors: [
            ...state.errors,
            {
              id: `err-${Date.now()}-${Math.random()}`,
              error,
              errorInfo,
              timestamp: new Date(),
            },
          ],
        })),
      removeError: (id) =>
        set((state) => ({
          errors: state.errors.filter((e) => e.id !== id),
        })),
      clearErrors: () => set({ errors: [], isPopupOpen: false }),
      showAllErrors: () => set({ isPopupOpen: true }),
      hideAllErrors: () => set({ isPopupOpen: false }),
    }),
    {
      name: 'error-store',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);

export const useErrors = () => {
  const errors = useErrorStore((state) => state.errors);
  const isPopupOpen = useErrorStore((state) => state.isPopupOpen);
  const addError = useErrorStore((state) => state.addError);
  const removeError = useErrorStore((state) => state.removeError);
  const clearErrors = useErrorStore((state) => state.clearErrors);
  const showAllErrors = useErrorStore((state) => state.showAllErrors);
  const hideAllErrors = useErrorStore((state) => state.hideAllErrors);

  return {
    errors,
    isPopupOpen,
    addError,
    removeError,
    clearErrors,
    showAllErrors,
    hideAllErrors,
  };
};

export default useErrorStore;