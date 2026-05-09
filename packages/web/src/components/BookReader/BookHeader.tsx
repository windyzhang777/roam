import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useBookContext, useCommonContext, useContentContext, useSearchContext, useViewLineContext } from '@/config/contexts';
import { FEATURES } from '@/config/features';
import { focusBody } from '@/utils';
import { bookTitleWithAuthor } from '@audiobook/shared';
import { ArrowBigDown, ArrowBigUp, Bookmark, Fullscreen, LibraryBig, ListEnd, ListStart, Loader, Minus, Plus, Search, Settings, X } from 'lucide-react';
import { type SetStateAction } from 'react';

interface BookHeaderProps {
  searching: boolean;
  setOpenPanelLeft: (value: SetStateAction<boolean>) => void;
  setOpenPanelRight: (value: SetStateAction<boolean>) => void;
}

export const BookHeader = ({ searching, setOpenPanelLeft, setOpenPanelRight }: BookHeaderProps) => {
  const { book, currentLine, chapters, bookmarks, toggleBookmark, viewChapter, totalLines, toggleChapter, deleteLine } = useBookContext();
  const { isPlaying, readingMode, jumpToIndex, userScroll, navigateBack } = useCommonContext();
  const { lines } = useContentContext();
  const { viewLine } = useViewLineContext();
  const { searchInputRef, searchText, setSearchText, openSearch, closeSearch, prevMatch, nextMatch } = useSearchContext();
  const isChapter = chapters.find((c) => currentLine === c.startIndex);
  const isBookmarked = bookmarks.find((b) => currentLine === b.index);

  if (!book || currentLine === undefined) return null;

  return (
    <header className="z-50">
      <nav id="controls" className="relative px-4 pt-0 pb-10 md:py-4">
        {/* Left Panel Group */}
        <div id="panel-left" title="Bookmars & Chapters" className="flex items-center gap-2">
          {/* Back to Books */}
          <Button size="icon" variant="ghost" id="back-to-books" title="Back to Books" onClick={() => navigateBack(false)}>
            <LibraryBig />
          </Button>

          {/* Close Side Panels */}
          <Button
            size="icon"
            variant="ghost"
            id="close-panels"
            title="Close Side Panels"
            onClick={() => {
              setOpenPanelLeft((prev) => !prev);
              setOpenPanelRight((prev) => !prev);
              focusBody();
            }}
          >
            <Fullscreen />
          </Button>

          {/* Jump to Start */}
          <Button
            size="icon"
            variant="ghost"
            id="jump-to-start"
            title="Jump To Start"
            onClick={async () => {
              await jumpToIndex(0);
            }}
          >
            <ArrowBigUp size={16} />
          </Button>

          {/* Chapter Buttons */}
          {/* Prev Chapter */}
          <Button
            size="icon"
            variant="ghost"
            id="prev-chapter"
            disabled={viewChapter?.chapterIndex === 0}
            onClick={async () => {
              if (!chapters || !viewChapter) return;
              if (isPlaying) userScroll();
              const targetChapterIndex = Math.max(0, viewLine > (viewChapter.startIndex ?? 0) ? viewChapter.chapterIndex : viewChapter.chapterIndex - 1);
              await jumpToIndex(chapters[targetChapterIndex].startIndex);
            }}
            title="Previous Chapter"
          >
            <ListStart />
          </Button>

          {/* Next Chapter */}
          <Button
            size="icon"
            variant="ghost"
            id="next-chapter"
            disabled={chapters.length < 1 || viewChapter?.chapterIndex === chapters.length - 1}
            onClick={async () => {
              if (!book || !viewChapter) return;
              if (isPlaying) userScroll();
              const targetChapterIndex = Math.min(viewChapter.chapterIndex + 1, chapters.length - 1);
              await jumpToIndex(chapters[targetChapterIndex].startIndex);
            }}
            title="Next Chapter"
          >
            <ListEnd />
          </Button>

          {/* Jump to End */}
          {FEATURES.ENABLE_SCROLL_TO_END && (
            <Button
              size="icon"
              variant="link"
              id="jump-to-end"
              title="Jump To End"
              onClick={async () => {
                if (!totalLines) return;
                await jumpToIndex(totalLines - 1);
              }}
            >
              <ArrowBigDown size={16} />
            </Button>
          )}
        </div>

        {/* Book Title */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/12 md:-translate-y-1/2 flex justify-center items-center w-[clamp(40px,80%,80%)] md:w-[clamp(40px,60%,30%)] lg:w-[40%]">
          <span title={bookTitleWithAuthor(book)} className="w-auto truncate font-semibold">
            {bookTitleWithAuthor(book)}
          </span>
        </div>

        {/* Right Panel Group */}
        <div id="panel-right" title="Font & Voice" className="flex items-center gap-2">
          {/* Search text */}
          <Button
            size="icon"
            variant="ghost"
            id="search"
            title="Search"
            onClick={openSearch}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openSearch();
              }
            }}
          >
            <Search />
          </Button>
          {readingMode === 'search' && (
            <div className={`mt-0.5 h-6 md:h-auto flex items-center no-wrap overflow-hidden rounded-lg duration-200 ${readingMode === 'search' ? 'bg-highlight' : 'bg-inherit'}`}>
              <Input
                autoFocus
                id="search-text"
                name="search-text"
                type="text"
                ref={searchInputRef}
                value={searchText}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setSearchText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={async (e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      await prevMatch();
                    } else {
                      await nextMatch();
                    }
                  }
                  if (e.key === 'Escape') {
                    closeSearch();
                  }
                }}
                className="w-auto min-w-[2ch] max-w-[10ch] border-none transition-all focus:ring-0 focus-visible:ring-0"
              />

              {searching ? (
                <Loader className="size-8 p-2" />
              ) : (
                searchText.length > 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    name="clear search"
                    title="Clear search"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeSearch();
                    }}
                  >
                    <X size={14} />
                  </Button>
                )
              )}
            </div>
          )}

          {/* Bookmark */}
          <Button
            variant="ghost"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              toggleBookmark(currentLine, lines[currentLine]);
            }}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <Bookmark className={isBookmarked && 'fill-primary stroke-primary'} />
          </Button>

          {FEATURES.ENABLE_CHAPTER_EDIT && (
            <Button
              size="icon"
              variant="link"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleChapter(currentLine, lines[currentLine]);
              }}
              title={isChapter ? 'Remove chapter' : 'Add as chapter'}
            >
              <Plus />
            </Button>
          )}

          {FEATURES.ENABLE_LINE_EDIT && (
            <Button
              size="icon"
              variant="link"
              onClick={async (e) => {
                e.stopPropagation();
                e.preventDefault();
                await deleteLine(currentLine);
              }}
              title="Delete line"
            >
              <Minus />
            </Button>
          )}

          {/* Right Panel */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (readingMode === 'search') {
                closeSearch();
              } else {
                setOpenPanelRight((prev) => !prev);
              }
            }}
          >
            <Settings />
          </Button>
        </div>
      </nav>

      {/* Progress Slider */}
      <Slider
        id="progress"
        value={[viewLine]}
        onValueChange={async (indices: number[]) => {
          const viewIndex = indices[0];
          await jumpToIndex(viewIndex);
        }}
        max={totalLines}
        step={1}
      />
    </header>
  );
};
