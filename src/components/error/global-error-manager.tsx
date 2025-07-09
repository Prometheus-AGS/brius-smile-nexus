'use client';

import { useErrors } from '@/stores/error-store';
import { Button } from '@/components/ui/button';
import { ErrorPagerPopup } from './error-pager-popup';

export function GlobalErrorManager() {
  const { errors, showAllErrors } = useErrors();

  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="destructive"
          onClick={showAllErrors}
          className="shadow-lg"
        >
          {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
        </Button>
      </div>
      <ErrorPagerPopup />
    </>
  );
}