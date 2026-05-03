import { PAGE_SIZE, type Book } from '@audiobook/shared';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { useAnimationFrame } from './useAnimationFrame';
import useTimer from './useTimer';

export type ScrollMode = 'user' | 'search' | 'tts';

export default function useBookNavigation(
  currentLine: number,
  lines: string[],
  loadMoreLines: (offset?: number, limit?: number) => Promise<void>,
  canFetch: boolean,
  isFetchingRef: RefObject<boolean>,
) {
  const [viewLine, setViewLine] = useState<Book['currentLine']>(0);
  const [isCurrentLineVisible, setIsCurrentLineVisible] = useState(false);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const { startTimer } = useTimer();
  const { startAnimationFrame } = useAnimationFrame();

  const scrollViewRef = useRef<ScrollView>(null);
  const linePositionRef = useRef<Record<number, { y: number; height: number }>>({});
  const scrollOffsetRef = useRef(0);

  const viewLineRef = useRef(viewLine);
  const isCurrentLineVisibleRef = useRef(false);
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
    setIsCurrentLineVisible(true);
    // focusBody();
  }, []);

  const userJump = useCallback(() => {
    isSearchJumpingRef.current = true;
    startTimer(() => (isSearchJumpingRef.current = false), 300);
  }, [startTimer]);

  const scrollToLine = useCallback(
    (index: number, animated: boolean = true) => {
      const pos = linePositionRef.current[index];
      if (!pos || scrollViewHeight <= 0) return;

      const centeredY = pos.y + pos.height / 2 - scrollViewHeight / 2;
      scrollViewRef.current?.scrollTo({ y: Math.max(0, centeredY), animated });
    },
    [scrollViewHeight],
  );

  const jumpToRead = (index: number) => {
    scrollToLine(index);
    if (viewLineRef.current !== index) updateViewLine(index);
    ttsScroll();
  };

  const jumpToIndex = async (index: number | undefined, shouldRead: boolean = false) => {
    if (index === undefined) return;

    if (index >= lines.length) {
      await loadMoreLines(0, index + PAGE_SIZE);
    }

    shouldReadViewLineRef.current = shouldRead;
    startAnimationFrame(() => scrollToLine(index));
    userJump();
    userScroll();

    if (viewLineRef.current !== index) updateViewLine(index);
  };

  const checkLineVisibility = useCallback((index: number) => {
    const pos = linePositionRef.current[currentLine];
    if (!pos || scrollViewHeight === 0) {
      return false;
    }
    const top = pos.y - scrollOffsetRef.current;
    const bottom = top + pos.height;
    const isVisible = top >= 0 && bottom <= scrollViewHeight;
    return isVisible;
  }, []);

  const updateIsCurrentLineVisible = useCallback(() => {
    const isVisible = checkLineVisibility(currentLine);
    isCurrentLineVisibleRef.current = isVisible || false;
    if (isCurrentLineVisibleRef.current !== isCurrentLineVisible) {
      setIsCurrentLineVisible(isCurrentLineVisibleRef.current);
    }
    return isVisible;
  }, [checkLineVisibility, currentLine, isCurrentLineVisible]);

  // Scroll events: track offset, load more when near bottom, update visiblity
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
      scrollOffsetRef.current = contentOffset.y;

      // Infinite scroll
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromBottom < 300 && canFetch && !isFetchingRef.current) {
        loadMoreLines(lines.length);
      }

      updateIsCurrentLineVisible();
    },
    [canFetch, isFetchingRef, lines.length, loadMoreLines, updateIsCurrentLineVisible],
  );

  const onLayout = useCallback((height: number) => setScrollViewHeight(height), []);

  const onContentSizeChange = useCallback((h: number) => setContentHeight(h), []);

  // Record a line's layout position
  const recordLineLayout = useCallback((index: number, y: number, height: number) => (linePositionRef.current[index] = { y, height }), []);

  // tts autoscroll
  useEffect(() => {
    const isVisible = updateIsCurrentLineVisible();
    if (isUserScrollRef.current || isVisible || scrollViewHeight === 0 || contentHeight === 0) return;
    scrollToLine(currentLine, false);

    viewLineRef.current = currentLine;
    if (!isSearchJumpingRef.current) {
      updateViewLine(viewLineRef.current);
    }
  }, [updateIsCurrentLineVisible, scrollViewHeight, contentHeight, currentLine, scrollToLine, updateViewLine]);

  // update line visibility on lines change
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateIsCurrentLineVisible();
      });
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [updateIsCurrentLineVisible]);

  return {
    viewLine,
    updateViewLine,
    viewLineRef,
    isCurrentLineVisible,
    scrollViewRef,
    linePositionRef,
    scrollerRef,
    isSearchJumpingRef,
    shouldReadViewLineRef,
    userScroll,
    ttsScroll,
    scrollToLine,
    jumpToRead,
    jumpToIndex,
    onScroll,
    onLayout,
    onContentSizeChange,
    recordLineLayout,
  };
}
