import { useDebounceCallback } from '@/common/useDebounceCallback';
import { focusBody } from '@/utils';
import { FIVE_MINUTES } from '@roam/shared';
import { useEffect } from 'react';

export function useBookUpdate<T>(_id: string | undefined, updates: T, canUpdate: boolean, onUpdate: (id: string, data: T) => Promise<void>) {
  const { run: debounceUpdate, flush: flushUpdate } = useDebounceCallback(() => {
    if (_id) onUpdate(_id, updates);
  }, FIVE_MINUTES);

  useEffect(() => {
    if (_id && canUpdate) {
      debounceUpdate();
    }
  }, [_id, canUpdate, debounceUpdate]);

  useEffect(() => {
    const handlePageExit = () => {
      flushUpdate();
      focusBody();
    };

    document.addEventListener('visibilitychange', handlePageExit);
    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('blur', handlePageExit);
    window.addEventListener('focus', handlePageExit);

    return () => {
      document.removeEventListener('visibilitychange', handlePageExit);
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('blur', handlePageExit);
      window.removeEventListener('focus', handlePageExit);
      flushUpdate();
    };
  }, [flushUpdate]);

  return { flushUpdate };
}
