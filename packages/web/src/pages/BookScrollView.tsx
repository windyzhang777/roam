import useTimer from '@/common/useTimer';
import { BookLine } from '@/components/BookReader/BookLine';
import { useBookContext, useCommonContext, useContentContext, useSettingContext } from '@/config/contexts';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef } from 'react';
import { Virtuoso, type ListProps, type VirtuosoHandle } from 'react-virtuoso';

interface BookScrollViewProps {
  loadMoreLines: () => Promise<void>;
  canFetch: boolean;
  isFetchingRef: React.RefObject<boolean>;
  loadingMore: boolean;
  hasMore: boolean;
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  scrollerRef: React.RefObject<HTMLElement | null>;
  isSearchJumpingRef: React.RefObject<boolean>;
}

export const BookScrollView = ({ loadMoreLines, canFetch, isFetchingRef, loadingMore, hasMore, virtuosoRef, scrollerRef, isSearchJumpingRef }: BookScrollViewProps) => {
  const { currentLine } = useBookContext();
  const { lines } = useContentContext();
  const { fontSize, lineHeight, indent, alignment } = useSettingContext();
  const { userScroll } = useCommonContext();
  const { startTimer } = useTimer();
  const suppressScrollPrefetchRef = useRef(true);

  const listStyle = useMemo(() => ({ fontSize, lineHeight, textAlign: alignment, paddingLeft: indent + 'ch', paddingRight: indent + 'ch' }), [fontSize, lineHeight, alignment, indent]);

  // Suppress Virtuoso from trigger loadMore in synchronous mount callback
  useEffect(() => {
    startTimer(() => (suppressScrollPrefetchRef.current = false), 250);
  }, [startTimer]);

  return (
    <Virtuoso
      id="book-lines"
      ref={virtuosoRef}
      scrollerRef={(el) => (scrollerRef.current = el as HTMLElement)}
      className="flex-1 leading-loose transition-transform duration-500 ease-in-out"
      data={lines}
      initialTopMostItemIndex={{ index: currentLine, align: 'start' }}
      increaseViewportBy={200}
      endReached={(index) => {
        if (!canFetch || isFetchingRef.current || isSearchJumpingRef.current || suppressScrollPrefetchRef.current) return;
        if (index < lines.length - 1) return;
        loadMoreLines();
      }}
      atBottomStateChange={(atBottom) => {
        if (!canFetch || isFetchingRef.current || !atBottom || suppressScrollPrefetchRef.current) return;
        loadMoreLines();
      }}
      components={{
        List: ({ style, children, ...props }: ListProps) => (
          <div {...props} tabIndex={0} onWheel={userScroll} onTouchMove={userScroll} className="outline-none list-none text-left mx-auto w-11/12 md:w-8/12" style={{ ...style, ...listStyle }}>
            {children}
          </div>
        ),
        Footer: () => (
          <div className="h-20 w-full flex justify-center items-center text-sm text-gray-300">
            {loadingMore ? (
              <span className="flex justify-center items-center">
                <Loader2 className="animate-spin mr-2" size={16} />
                &nbsp;Loading more...
              </span>
            ) : !hasMore ? (
              <span>You've reach the end</span>
            ) : null}
          </div>
        ),
      }}
      // Individual Line Item
      itemContent={(index, line) => <BookLine index={index} line={line} />}
    />
  );
};
