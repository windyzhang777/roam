import { DELETE_MARKER, FONT_SIZE_DEFAULT, IMAGE_MARKER, INDENT_DEFAULT, LINE_HEIGHT_DEFAULT, PARAGRAPH_SPACING_DEFAULT } from '@audiobook/shared';
import { useCallback, useMemo, useState } from 'react';

export interface PageBoundary {
  startLine: number;
  endLine: number;
}

export default function useBookPagination(lines: string[], fontSize: number | undefined, lineHeight: number | undefined, paragraphSpacing: number | undefined, indent: number | undefined) {
  const [currentPage, setCurrentPage] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const pages = useMemo((): PageBoundary[] => {
    if (containerHeight === 0 || containerWidth === 0 || lines.length === 0) {
      return [];
    }

    const fs = fontSize ?? FONT_SIZE_DEFAULT;
    const lh = lineHeight ?? LINE_HEIGHT_DEFAULT;
    const ps = paragraphSpacing ?? PARAGRAPH_SPACING_DEFAULT;
    const ind = indent ?? INDENT_DEFAULT;

    const chPx = fs * 0.55; // 1ch
    const columnPaddingX = ind * chPx * 2 + 40;
    const lineItemPaddingX = 24;
    const avgCharWidth = fs * 0.55;
    const usableWidth = containerWidth - columnPaddingX - lineItemPaddingX;
    const charsPerLine = Math.max(1, Math.floor(usableWidth / avgCharWidth));
    const singleLineHeight = fs * lh;
    const itemPaddingPx = ps * chPx * 2;
    const marginPerItem = 12;
    const columnPaddingY = 40;
    const usableHeight = containerHeight - columnPaddingY;

    // Build pages: fill columns sequentially (left -> right for double)
    const newPages: PageBoundary[] = [];
    let lineIndex = 0;

    while (lineIndex < lines.length) {
      const pageStart = lineIndex;
      let columnHeight = 0;

      while (lineIndex < lines.length) {
        const line = lines[lineIndex];

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

        if (columnHeight + itemHeight > usableHeight && lineIndex > pageStart) break;

        columnHeight += itemHeight;
        lineIndex++;
      }

      // If no line fits at all, force at least one line per column
      if (lineIndex === pageStart) {
        lineIndex++;
      }

      newPages.push({ startLine: pageStart, endLine: lineIndex });
    }

    return newPages;
  }, [containerHeight, containerWidth, fontSize, indent, lineHeight, lines, paragraphSpacing]);

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
  const getPageLines = useCallback((): number[] => {
    if (pages.length === 0 || effectivePage >= pages.length) {
      return [];
    }

    const page = pages[effectivePage];
    const indices: number[] = [];
    for (let i = page.startLine; i < page.endLine; i++) {
      indices.push(i);
    }

    return indices;
  }, [effectivePage, pages]);

  const onContainerLayout = useCallback((height: number, width: number) => {
    setContainerHeight(height);
    setContainerWidth(width);
  }, []);

  return { currentPage: effectivePage, totalPages, getPageForLine, goToPage, nextPage, prevPage, goToLine, getPageLines, onContainerLayout };
}
