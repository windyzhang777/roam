import useBookPagination from '@/common/useBookPagination';
import { BookLine } from '@/components/BookReader/BookLine';
import { useBookContext, useContentContext, useSettingContext } from '@/config/contexts';
import { cn } from '@/lib/utils';
import { paginationStore } from '@/stores/paginationStore';
import { Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface BookPageViewProps {
  loadMoreLines: () => Promise<void>;
  canFetch: boolean;
  isFetchingRef: React.RefObject<boolean>;
  loadingMore: boolean;
  hasMore: boolean;
  goToLineRef: React.RefObject<((lineIndex: number) => void | null) | null>;
}

export const BookPageView = ({ loadMoreLines, canFetch, isFetchingRef, loadingMore, hasMore, goToLineRef }: BookPageViewProps) => {
  const { currentLine } = useBookContext();
  const { lines } = useContentContext();
  const { fontSize, lineHeight, paragraphSpacing, indent, alignment, pageView } = useSettingContext();

  const [animating, setAnimating] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // pagination hook
  const { currentPage, totalPages, getPageForLine, goToPage, nextPage, prevPage, goToLine, getPageLines } = useBookPagination(
    lines,
    fontSize,
    lineHeight,
    paragraphSpacing,
    indent,
    pageView,
    containerRef,
  );

  const { left, right } = getPageLines();
  const columnStyle = { fontSize, lineHeight, textAlign: alignment, paddingLeft: `${indent}ch`, paddingRight: `${indent}ch` };

  const animatedPrevPage = useCallback(() => {
    if (currentPage <= 0) return;

    setAnimating('right');
    setTimeout(() => {
      prevPage();
      setAnimating(null);
    }, 250);
  }, [currentPage, prevPage]);

  const animatedNextPage = useCallback(() => {
    if (currentPage >= totalPages - 1) return;

    setAnimating('left');
    setTimeout(() => {
      nextPage();
      setAnimating(null);
    }, 250);
  }, [currentPage, totalPages, nextPage]);

  // Expose goToLine to parent for nav
  useEffect(() => {
    goToLineRef.current = goToLine;
  }, [goToLine, goToLineRef]);

  // Sync pagination state to store
  useEffect(() => {
    paginationStore.set(currentPage, totalPages);
  }, [currentPage, totalPages]);

  // Nav to current line's page on initial load & when currentLine changes
  useEffect(() => {
    if (totalPages === 0) return;

    const effectivePage = getPageForLine(currentLine);
    goToPage(effectivePage);
  }, [currentLine, getPageForLine, goToPage, totalPages]);

  // Load more when near the end
  useEffect(() => {
    if (!canFetch || isFetchingRef.current || !hasMore) return;
    if (totalPages === 0) return;

    // Prefetch if within 2 pages of the end
    const effectivePage = getPageForLine(currentLine);
    if (effectivePage >= totalPages - 2) {
      loadMoreLines();
    }
  }, [canFetch, getPageForLine, currentLine, hasMore, isFetchingRef, pageView, loadMoreLines, totalPages]);

  // hijack the browser's keyboard nav
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        animatedPrevPage();
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        animatedNextPage();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [animatedPrevPage, animatedNextPage]);

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      {/* Page Content Area */}
      <div className="flex-1 overflow-hidden mx-auto w-11/12 md:w-8/12">
        <div
          ref={containerRef}
          className={cn('mt-4 h-full flex transition-transform duration-200 ease-in-out', animating === 'left' && '-translate-x-4 opacity-0', animating === 'right' && 'translate-x-4 opacity-0')}
        >
          {/* Left Column */}
          <div className={cn('relative h-full overflow-hidden list-none px-5 pt-6 pb-4', pageView === 'double' ? 'w-1/2 border-r border-border' : 'w-full')} style={columnStyle}>
            <span className="absolute top-0 left-4 text-xs text-muted-foreground/50 tabular-nums">{currentPage * (pageView === 'double' ? 2 : 1) + 1}</span>
            {left.map((lineIndex) => (
              <BookLine key={lineIndex} index={lineIndex} line={lines[lineIndex]} />
            ))}
          </div>

          {/* Right Column */}
          {pageView === 'double' && (
            <div className="relative w-1/2 h-full overflow-hidden list-none px-5 pt-6 pb-4" style={columnStyle}>
              <span className="absolute top-0 right-4 text-xs text-muted-foreground/50 tabular-nums">{currentPage * 2 + 2}</span>
              {right.map((lineIndex) => (
                <BookLine key={lineIndex} index={lineIndex} line={lines[lineIndex]} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prev Page */}
      <div onClick={animatedPrevPage} aria-label="Previous page" className="absolute top-0 left-0 w-2/12 md:w-3/12 h-full cursor-pointer z-10">
        {currentPage >= 0 && <div className="w-full h-full opacity-0 hover:opacity-40 transition-opacity bg-foreground/10" />}
      </div>

      {/* Next Page */}
      <div onClick={animatedNextPage} aria-label="Next page" className="absolute top-0 right-0 w-2/12 md:w-3/12 h-full cursor-pointer z-10">
        {currentPage <= totalPages - 1 && <div className="w-full h-full opacity-0 hover:opacity-40 transition-opacity bg-foreground/10" />}
      </div>

      {/* Loading Indicator */}
      {loadingMore && (
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 flex justify-center items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={16} />
          &nbsp;Loading more...
        </span>
      )}
    </div>
  );
};
