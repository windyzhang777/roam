import { DELETE_MARKER, FONT_SIZE_DEFAULT, IMAGE_MARKER, INDENT_DEFAULT, LINE_HEIGHT_DEFAULT, PARAGRAPH_SPACING_DEFAULT, type PageView } from '@audiobook/shared';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebounceCallback } from './useDebounceCallback';

export interface PageBoundary {
  startLine: number;
  endLine: number;
  splitLine: number;
}

export default function useBookPagination(
  lines: string[],
  fontSize: number | undefined,
  lineHeight: number | undefined,
  paragraphSpacing: number | undefined,
  indent: number | undefined,
  pageView: PageView | undefined,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [currentPage, setCurrentPage] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const pages = useMemo((): PageBoundary[] => {
    if (pageView === 'scroll' || containerHeight === 0 || containerWidth === 0 || lines.length === 0) {
      return [];
    }

    const fs = fontSize ?? FONT_SIZE_DEFAULT;
    const lh = lineHeight ?? LINE_HEIGHT_DEFAULT;
    const ps = paragraphSpacing ?? PARAGRAPH_SPACING_DEFAULT;
    const ind = indent ?? INDENT_DEFAULT;

    const columnWidth = pageView === 'double' ? Math.floor(containerWidth / 2) : containerWidth;
    const columnsPerPage = pageView === 'double' ? 2 : 1;

    const chPx = fs * 0.55; // 1ch
    const columnPaddingX = ind * chPx * 2 + 40;
    const lineItemPaddingX = 24;
    const avgCharWidth = fs * 0.55;
    const usableWidth = columnWidth - columnPaddingX - lineItemPaddingX;
    const charsPerLine = Math.max(1, Math.floor(usableWidth / avgCharWidth));
    const singleLineHeight = fs * lh;
    const itemPaddingPx = ps * chPx * 2;
    const marginPerItem = 12;
    const columnPaddingY = 40;
    const usableHeight = containerHeight - columnPaddingY - singleLineHeight * (pageView === 'double' ? 4 : 0);

    // Build pages: fill columns sequentially (left -> right for double)
    const newPages: PageBoundary[] = [];
    let lineIndex = 0;

    while (lineIndex < lines.length) {
      const pageStart = lineIndex;
      let remainingColumns = columnsPerPage;
      let pageEndLine = lineIndex;

      while (remainingColumns > 0 && pageEndLine < lines.length) {
        let columnHeight = 0;

        while (pageEndLine < lines.length) {
          const line = lines[pageEndLine];

          let itemHeight: number;
          const isDeleted = line.startsWith(DELETE_MARKER);
          const isImage = line.startsWith(IMAGE_MARKER);

          if (isDeleted) {
            itemHeight = 1;
          } else if (isImage) {
            itemHeight = 200;
          } else {
            const len = line.length || 1;
            const wrappedLines = Math.max(1, Math.ceil(len / charsPerLine));
            itemHeight = wrappedLines * singleLineHeight + itemPaddingPx + marginPerItem;
          }

          if (columnHeight + itemHeight > usableHeight && pageEndLine > pageStart) break;

          columnHeight += itemHeight;
          pageEndLine++;
        }

        // If no line fits at all, force at least one line per column
        if (pageEndLine === pageStart) {
          pageEndLine++;
        }

        remainingColumns--;
        if (remainingColumns > 0) {
          lineIndex = pageEndLine;
        }
      }
      newPages.push({ startLine: pageStart, endLine: pageEndLine, splitLine: columnsPerPage === 2 ? lineIndex : pageEndLine });
      lineIndex = pageEndLine;
    }

    return newPages;
  }, [containerHeight, containerWidth, fontSize, indent, lineHeight, lines, pageView, paragraphSpacing]);

  const totalPages = pages.length;
  const effectivePage = totalPages > 0 ? Math.min(currentPage, totalPages - 1) : 0;

  const getPageForLine = useCallback(
    (lineIndex: number) => {
      for (let i = 0; i < pages.length; i++) {
        if (lineIndex >= pages[i].startLine && lineIndex < pages[i].endLine) {
          return i;
        }
      }
      // If beyond last page, return last
      return Math.max(0, pages.length - 1);
    },
    [pages],
  );

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(0, Math.min(page, totalPages - 1));
      setCurrentPage(clamped);
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    goToPage(effectivePage + 1);
  }, [goToPage, effectivePage]);

  const prevPage = useCallback(() => {
    goToPage(effectivePage - 1);
  }, [goToPage, effectivePage]);

  const goToLine = useCallback(
    (lineIndex: number) => {
      const page = getPageForLine(lineIndex);
      goToPage(page);
    },
    [getPageForLine, goToPage],
  );

  // Get lines for the current page, split into columns for double mode
  const getPageLines = useCallback((): { left: number[]; right: number[] } => {
    if (pages.length === 0 || effectivePage >= pages.length) {
      return { left: [], right: [] };
    }

    const page = pages[effectivePage];
    const allIndices: number[] = [];
    for (let i = page.startLine; i < page.endLine; i++) {
      allIndices.push(i);
    }

    if (pageView === 'double') {
      // Split into 2 columns at the actual column boundary computed during page building
      const splitOffset = page.splitLine - page.startLine;
      return { left: allIndices.slice(0, splitOffset), right: allIndices.slice(splitOffset) };
    }

    return { left: allIndices, right: [] };
  }, [effectivePage, pageView, pages]);

  const { run: debounceResize } = useDebounceCallback((height: number, width: number) => {
    setContainerHeight(height);
    setContainerWidth(width);
  }, 50);

  // Observe container size (debounced)
  useEffect(() => {
    const target = containerRef.current;
    if (!target || pageView === 'scroll') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        debounceResize(entry.contentRect.height, entry.contentRect.width);
      }
    });
    observer.observe(target);

    // Read initial size
    const rect = target.getBoundingClientRect();
    setContainerHeight(rect.height);
    setContainerWidth(rect.width);

    return () => observer.disconnect();
  }, [containerRef, debounceResize, pageView]);

  return { currentPage: effectivePage, totalPages, getPageForLine, goToPage, nextPage, prevPage, goToLine, getPageLines };
}
