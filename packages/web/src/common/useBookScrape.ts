import { api } from '@/services/api';
import type { Book, UploadProgress } from '@audiobook/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ScrapeProgress extends UploadProgress {
  title?: string;
  message?: string;
}
export type ScrapeStatus = 'scraping' | 'error';
export interface ScrapingBook {
  id: string;
  url: string;
  title: string;
  status: ScrapeStatus;
  progress: ScrapeProgress;
  error: string;
  book?: Book;
}

let scrapeCount = 0;

export function useBookScrape(onClose?: () => void, onComplete?: (book: Book) => void) {
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapes, setScrapes] = useState<ScrapingBook[]>([]);
  const stopRefs = useRef<Map<string, () => void>>(new Map());

  const updateScrape = (id: string, patch: Partial<ScrapingBook>) => {
    setScrapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)) || []);
  };

  const removeScrape = useCallback((id: string) => {
    const closeFn = stopRefs.current.get(id);
    if (closeFn) {
      closeFn();
      stopRefs.current.delete(id);
    }
    setScrapes((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const startScrape = useCallback(() => {
    if (!scrapeUrl.trim() || !scrapeUrl.startsWith('http')) return;

    const id = `scrape-${++scrapeCount}`;
    const url = scrapeUrl.trim();
    const entry: ScrapingBook = {
      id,
      url,
      title: '',
      status: 'scraping',
      progress: { uploadedBytes: 0, totalBytes: 0, percentage: 0, currentChunk: 0, totalChunks: 0, speed: 0, estimatedTimeRemaining: 0 },
      error: '',
    };
    setScrapes((prev) => [entry, ...prev]);
    setScrapeUrl('');
    onClose?.();

    const closeFn = api.books.scrape(
      url,
      (progress) => updateScrape(id, { progress, title: progress.title || '' }),
      (book) => {
        // Success!
        stopRefs.current.delete(id);
        setScrapes((prev) => prev.filter((s) => s.id !== id));
        onComplete?.(book);
      },
      (errorMsg) => {
        // Error - keep progress visible
        updateScrape(id, { status: 'error', error: errorMsg });
      },
    );

    stopRefs.current.set(id, closeFn);
    // stopScrapeRef.current = closeFn;
  }, [scrapeUrl, onClose, onComplete]);

  const isScraping = scrapes.some((s) => s.status === 'scraping');

  useEffect(() => {
    return () => {
      stopRefs.current.forEach((stopFn) => stopFn());
      stopRefs.current.clear();
    };
  }, []);

  return { scrapeUrl, setScrapeUrl, scrapes, isScraping, startScrape, removeScrape };
}
