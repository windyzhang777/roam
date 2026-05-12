import { focusBody } from '@/utils';
import { PAGE_SIZE, type Book, type PageView } from '@audiobook/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LocationOptions, type VirtuosoHandle } from 'react-virtuoso';
import { useAnimationFrame } from './useAnimationFrame';
import useTimer from './useTimer';

export type ScrollMode = 'user' | 'search' | 'tts';

interface useBookNavigationOptions {
  pageView: NonNullable<PageView | undefined> | undefined;
  goToLineRef: React.RefObject<((lineIndex: number) => void | null) | null>;
}

export default function useBookNavigation(
  loading: boolean,
  currentLine: number,
  lines: string[],
  loadMoreLines: (offset?: number, limit?: number) => Promise<void>,
  options: useBookNavigationOptions,
) {
  const [viewLine, setViewLine] = useState<Book['currentLine']>(0);
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 0 });
  const isCurrentLineVisible = useMemo(() => currentLine >= visibleRange.startIndex && currentLine <= visibleRange.endIndex, [currentLine, visibleRange]);
  const currentLineDirection = useMemo((): 'up' | 'down' => (currentLine < visibleRange.startIndex ? 'up' : 'down'), [currentLine, visibleRange]);

  const { startTimer } = useTimer();
  const { startAnimationFrame } = useAnimationFrame();

  const viewLineRef = useRef(viewLine);
  const visibleRangeRef = useRef(visibleRange);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const isSearchJumpingRef = useRef(false);
  const shouldReadViewLineRef = useRef(false);
  const isUserScrollRef = useRef(false);

  const updateViewLine = useCallback((index: number) => {
    viewLineRef.current = index;
    setViewLine(index);
  }, []);

  const userScroll = useCallback(() => {
    console.log(`userScroll`);
    isUserScrollRef.current = true;
  }, []);

  const ttsScroll = useCallback(() => {
    console.log(`ttsScroll`);
    isUserScrollRef.current = false;
    focusBody();
  }, []);

  const userJump = useCallback(() => {
    console.log(`userJump`);
    isSearchJumpingRef.current = true;
    startTimer(() => (isSearchJumpingRef.current = false), 300);
  }, [startTimer]);

  const updateVisibleRange = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const items = scroller.querySelectorAll('[data-item-index]');
    if (items.length === 0) return;

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (rect.top >= scrollerRect.top && rect.bottom <= scrollerRect.bottom) {
        startIndex = Number(items[i].getAttribute('data-item-index'));
        break;
      }
    }

    for (let i = items.length - 1; i >= 0; i--) {
      const rect = items[i].getBoundingClientRect();
      if (rect.top >= scrollerRect.top && rect.bottom <= scrollerRect.bottom) {
        endIndex = Number(items[i].getAttribute('data-item-index'));
        break;
      }
    }

    if (startIndex === -1 || endIndex === -1) return;
    const prev = visibleRangeRef.current;
    if (prev.startIndex !== startIndex || prev.endIndex !== endIndex) {
      const next = { startIndex, endIndex };
      visibleRangeRef.current = next;
      setVisibleRange(next);
    }
  }, []);

  const isLineVisible = useCallback((index: number) => {
    const { startIndex, endIndex } = visibleRangeRef.current;
    return index >= startIndex && index <= endIndex;
  }, []);

  const scrollToLine = useCallback(
    (index: number, behavior: LocationOptions['behavior'] = 'auto') => {
      if (options?.pageView && options.pageView !== 'scroll' && options?.goToLineRef?.current) {
        options.goToLineRef.current(index);
        return;
      }
      const isVisible = isLineVisible(index);
      if (isVisible) return;
      console.log(`scrollToLine :`, index, behavior);
      startTimer(() => virtuosoRef.current?.scrollToIndex({ index, align: 'start', behavior, offset: -20 }), 100);
    },
    [startTimer, isLineVisible],
  );

  const jumpToRead = (index: number) => {
    console.log(`jumpToRead`);
    scrollToLine(index);
    if (viewLineRef.current !== index) updateViewLine(index);
    ttsScroll();
  };

  const jumpToIndex = async (index: number | undefined, shouldRead: boolean = false) => {
    if (index === undefined) return;
    console.log(`jumpToIndex`);

    if (index >= lines.length) {
      await loadMoreLines(0, index + PAGE_SIZE);
    }

    shouldReadViewLineRef.current = shouldRead;
    startAnimationFrame(() => scrollToLine(index));
    userJump();
    userScroll();

    if (viewLineRef.current !== index) updateViewLine(index);
  };

  // tts autoscroll
  useEffect(() => {
    if (loading) return;
    const isVisible = isLineVisible(currentLine);
    if (isUserScrollRef.current || isVisible) return;
    scrollToLine(currentLine, 'smooth');

    viewLineRef.current = currentLine;
    if (!isSearchJumpingRef.current) {
      updateViewLine(viewLineRef.current);
    }
  }, [loading, isLineVisible, currentLine, scrollToLine, updateViewLine]);

  // update visible range on scroll
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateVisibleRange();
      });
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [loading, updateVisibleRange]);

  return {
    viewLine,
    updateViewLine,
    viewLineRef,
    isCurrentLineVisible,
    currentLineDirection,
    virtuosoRef,
    scrollerRef,
    isSearchJumpingRef,
    shouldReadViewLineRef,
    userScroll,
    ttsScroll,
    scrollToLine,
    jumpToRead,
    jumpToIndex,
  };
}
