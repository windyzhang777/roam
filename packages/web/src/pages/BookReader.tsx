import { useAnimationFrame } from '@/common/useAnimationFrame';
import useBookNavigation from '@/common/useBookNavigation';
import { useBookReader } from '@/common/useBookReader';
import { useBookSearch } from '@/common/useBookSearch';
import { useReaderSettings } from '@/common/useBookSettings';
import useBookSpeech from '@/common/useBookSpeech';
import { BookControl } from '@/components/BookReader/BookControl';
import { BookHeader } from '@/components/BookReader/BookHeader';
import { SidePanelLeft, SidePanelRight } from '@/components/BookReader/BookSidePanel';
import { Button } from '@/components/ui/button';
import { TextContextMenu } from '@/components/ui/ContextMenu';
import { BookContext, CommonContext, ContentContext, SearchContext, SettingContext, SpeechContext, ViewLineContext } from '@/config/contexts';
import { cn } from '@/lib/utils';
import { BookPageView } from '@/pages/BookPageView';
import { BookScrollView } from '@/pages/BookScrollView';
import { wordHighlightStore } from '@/stores/wordHighlightStore';
import { focusBody, getChapterIndex } from '@/utils';
import { bookTitleWithAuthor, type BookMark } from '@audiobook/shared';
import { ChevronRight, Loader } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export type ReadingMode = 'tts' | 'search' | 'edit';

export const BookReader = () => {
  const navigate = useNavigate();
  const { id: _id } = useParams<{ id: string }>();

  const [readingMode, setReadingMode] = useState<ReadingMode>('tts');

  // timer hook
  const { startAnimationFrame } = useAnimationFrame();

  // data hooks
  const {
    loading: loadingBook,
    book,
    lines,
    lang,
    hasMore,
    totalLines,
    loadingMore,
    currentLine,
    updateCurrentLine,
    currentLineRef,
    lastCompleted,
    chapters,
    setChapters,
    toggleChapter,
    bookmarks,
    setBookmarks,
    toggleBookmark,
    highlights,
    setHighlights,
    toggleHighlight,
    onBookCompleted,
    canFetch,
    isFetchingRef,
    flushBook,
    hydrateChapterByIndex,
    loadMoreLines,
    deleteLine,
    restoreLine,
    toaster,
  } = useBookReader(_id);

  const {
    loading: loadingSetting,
    fontSize,
    setFontSize,
    rate,
    setRate,
    setVoice,
    selectedVoice,
    lineHeight,
    setLineHeight,
    paragraphSpacing,
    setParagraphSpacing,
    indent,
    setIndent,
    alignment,
    setAlignment,
    pageView,
    setPageView,
    flushSetting,
    availableVoices,
  } = useReaderSettings(_id, lang);

  const goToLineRef = useRef<(lineIndex: number) => void | null>(null);
  const loading = useMemo(() => !_id || loadingBook || loadingSetting, [_id, loadingBook, loadingSetting]);

  // navigation hook
  const {
    viewLine,
    updateViewLine,
    viewLineRef,
    isCurrentLineVisible,
    virtuosoRef,
    scrollerRef,
    isSearchJumpingRef,
    shouldReadViewLineRef,
    userScroll,
    ttsScroll,
    scrollToLine,
    jumpToRead,
    jumpToIndex,
  } = useBookNavigation(loading && lines.length === 0, currentLine, lines, loadMoreLines, { pageView, goToLineRef });

  const startFromLine = useCallback(
    (index: number) => {
      updateCurrentLine(index);
      updateViewLine(index);
    },
    [updateCurrentLine, updateViewLine],
  );

  // speech hook
  const { isPlaying, play, pause, resume, stop } = useBookSpeech(_id, lines, lang, totalLines, selectedVoice, rate, currentLine, startFromLine, loadMoreLines, onBookCompleted);

  // search hook
  const {
    loading: searching,
    searchInputRef,
    searchText,
    setSearchText,
    searchRes,
    currentMatch,
    clickMatch,
    prevMatch,
    nextMatch,
    openSearch,
    closeSearch,
  } = useBookSearch(
    _id,
    viewLine,
    jumpToIndex,
    () => setReadingMode('search'),
    () => setReadingMode('tts'),
  );

  const [openPanelLeft, setOpenPanelLeft] = useState(true);
  const [openPanelRight, setOpenPanelRight] = useState(readingMode === 'search' ? searchRes.length > 0 : true);

  const viewChapter = useMemo(() => {
    if (!chapters) return undefined;
    const chapterIndex = getChapterIndex(viewLine, chapters);
    const chapter = chapters[chapterIndex];
    if (!chapter) return undefined;
    return { chapterIndex, ...chapter };
  }, [viewLine, chapters]);

  const flushUpdate = () => {
    flushBook();
    flushSetting();
  };

  const ttsFocus = useCallback(() => {
    closeSearch();
    ttsScroll();
  }, [closeSearch, ttsScroll]);

  const navigateBack = (replace: boolean = false) => {
    flushUpdate();
    navigate('/', { replace });
  };

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      let startFrom = shouldReadViewLineRef.current ? viewLineRef.current : currentLineRef.current;
      startFrom = startFrom >= totalLines ? 0 : startFrom; // if at the end, reset to start from the first line
      startFromLine(startFrom);
      ttsFocus();

      startAnimationFrame(() => scrollToLine(startFrom));
      play(startFrom);
      shouldReadViewLineRef.current = false;
    }
    focusBody();
  }, [currentLineRef, viewLineRef, startFromLine, ttsFocus, isPlaying, startAnimationFrame, scrollToLine, totalLines, shouldReadViewLineRef, play, pause]);

  const handleLineClick = (index: number) => {
    startFromLine(index);
    ttsFocus();
    if (isPlaying) {
      resume(index);
    } else {
      play(index);
    }
  };

  const moveToLine = useCallback(
    (index: number) => {
      if (index == currentLineRef.current) return;
      startFromLine(index);
      ttsFocus();
      if (isPlaying) stop();
    },
    [currentLineRef, isPlaying, startFromLine, ttsFocus, stop],
  );

  const prevLine = useCallback(() => {
    const index = Math.max(currentLineRef.current - 1, 0);
    moveToLine(index);
  }, [currentLineRef, moveToLine]);

  const nextLine = useCallback(() => {
    const index = Math.min(currentLineRef.current + 1, totalLines - 1);
    moveToLine(index);
  }, [currentLineRef, totalLines, moveToLine]);

  // cleanup on unmount
  useEffect(() => () => stop(), [_id, stop]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      // console.log(`activeElement :`, activeElement);

      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
        return;
      }

      if (activeElement === document.body && e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      }

      if (activeElement === document.body && e.key === 'ArrowDown') {
        e.preventDefault();
        nextLine();
      }

      if (activeElement === document.body && e.key === 'ArrowUp') {
        e.preventDefault();
        prevLine();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [closeSearch, handlePlayPause, nextLine, prevLine]);

  if (loading) {
    return (
      <div aria-label="loading" className="h-full flex justify-center items-center gap-2">
        <Loader />
      </div>
    );
  }

  if (!_id || !book) {
    return (
      <div className="absolute top-0 left-0 h-full w-full bg-white opacity-50 flex flex-col justify-center items-center gap-2">
        <Button onClick={() => navigateBack(true)}>Go Back</Button>
      </div>
    );
  }

  return (
    <CommonContext.Provider
      value={{
        isPlaying,
        handlePlayPause,
        readingMode,
        jumpToIndex,
        jumpToRead: () => jumpToRead(currentLineRef.current),
        ttsScroll,
        userScroll,
        navigateBack,
        hydrateChapterByIndex,
        handleLineClick,
        prevLine,
        nextLine,
      }}
    >
      <ViewLineContext.Provider value={{ viewLine, updateViewLine }}>
        <BookContext.Provider
          value={{
            _id,
            currentLine,
            totalLines,
            lastCompleted,
            chapters,
            setChapters,
            toggleChapter,
            bookmarks,
            setBookmarks,
            toggleBookmark,
            highlights,
            setHighlights,
            toggleHighlight,
            viewChapter,
            book,
            deleteLine,
            restoreLine,
          }}
        >
          <ContentContext.Provider value={{ lines, lang, hasMore }}>
            <SearchContext.Provider value={{ searchInputRef, searchText, setSearchText, searchRes, currentMatch, clickMatch, prevMatch, nextMatch, openSearch, closeSearch }}>
              <SettingContext.Provider
                value={{
                  fontSize,
                  setFontSize,
                  rate,
                  setRate,
                  setVoice,
                  selectedVoice,
                  lineHeight,
                  setLineHeight,
                  paragraphSpacing,
                  setParagraphSpacing,
                  indent,
                  setIndent,
                  alignment,
                  setAlignment,
                  pageView,
                  setPageView,
                  availableVoices,
                }}
              >
                <SpeechContext.Provider value={{ isPlaying, play, pause, resume: () => resume(currentLineRef.current), stop }}>
                  <div className="h-full relative">
                    <div className="flex flex-col gap-2 h-[95%] overflow-hidden">
                      <BookHeader searching={searching} setOpenPanelLeft={setOpenPanelLeft} setOpenPanelRight={setOpenPanelRight} />

                      {/* Start of Reading Area */}

                      {pageView === 'scroll' ? (
                        <BookScrollView
                          loadMoreLines={() => loadMoreLines(lines.length)}
                          canFetch={canFetch}
                          isFetchingRef={isFetchingRef}
                          loadingMore={loadingMore}
                          hasMore={hasMore}
                          virtuosoRef={virtuosoRef}
                          scrollerRef={scrollerRef}
                          isSearchJumpingRef={isSearchJumpingRef}
                        />
                      ) : (
                        <BookPageView
                          loadMoreLines={() => loadMoreLines(lines.length)}
                          canFetch={canFetch}
                          isFetchingRef={isFetchingRef}
                          loadingMore={loadingMore}
                          hasMore={hasMore}
                          goToLineRef={goToLineRef}
                        />
                      )}
                      {/* End of Reading Area */}
                    </div>

                    <BookControl setOpenPanelLeft={setOpenPanelLeft} />
                    <TextContextMenu />

                    {/* Indicator Message */}
                    {book.lastReadAt && !isCurrentLineVisible && lines[currentLine] && (
                      <ActiveWordIndicator
                        line={lines[currentLine]}
                        onClick={() => {
                          jumpToRead(currentLineRef.current);
                          if (!isPlaying) play(currentLineRef.current);
                        }}
                      />
                    )}

                    {/* Restore delete */}
                    {toaster}

                    {/* Left Panel */}
                    <SidePanelLeft
                      open={openPanelLeft}
                      onClose={() => setOpenPanelLeft(false)}
                      onUpdateBookmark={(merged: BookMark[]) => {
                        setBookmarks(merged);
                        alert(`Imported ${merged.length} bookmarks for ${bookTitleWithAuthor(book)}!`);
                        setTimeout(() => {
                          flushUpdate();
                        }, 100);
                      }}
                    />

                    {/* Right Panel */}
                    <SidePanelRight
                      open={openPanelRight}
                      onClose={() => {
                        closeSearch();
                        setOpenPanelRight(false);
                      }}
                    />
                  </div>
                </SpeechContext.Provider>
              </SettingContext.Provider>
            </SearchContext.Provider>
          </ContentContext.Provider>
        </BookContext.Provider>
      </ViewLineContext.Provider>
    </CommonContext.Provider>
  );
};

const ActiveWordIndicator = ({ line, onClick }: { line: string; onClick: () => void }) => {
  const activeWord = useSyncExternalStore(wordHighlightStore.subscribe, wordHighlightStore.getActiveWord);
  const hasActive = activeWord && activeWord.charIndex >= 0;
  const word = hasActive && activeWord ? line.slice(activeWord.charIndex, activeWord.charIndex + activeWord.charLength) : line.slice(0, 5);

  return (
    <Button
      variant="ghost"
      id="indicator-message"
      onClick={onClick}
      className={cn('z-20 p-2 truncate absolute top-25 left-1/2 -translate-x-1/2 px-4 py-1 text-sm justify-start bg-highlight', 'opacity-20 hover:opacity-100 transition-opacity duration-300')}
    >
      <ChevronRight size={12} />
      <mark className="rounded-md outline-none bg-primary">{word}</mark>
    </Button>
  );
};
