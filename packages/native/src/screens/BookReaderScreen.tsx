import useBookNavigation from '@/common/useBookNavigation';
import { useBookReader } from '@/common/useBookReader';
import { useBookSearch } from '@/common/useBookSearch';
import { useReaderSettings } from '@/common/useBookSettings';
import useBookSpeech from '@/common/useBookSpeech';
import { BookPageView } from '@/components/BookPageView';
import { BookScrollView } from '@/components/BookScrollView';
import { useThemeContext } from '@/components/theme-provider';
import { BookContext, CommonContext, ContentContext, SettingContext, SpeechContext } from '@/config/contexts';
import { getChapterIndex } from '@/utils';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Loader } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type ReadingMode = 'tts' | 'search' | 'edit';

export const BookReaderScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookId: _id } = route.params;

  const [readingMode, setReadingMode] = useState<ReadingMode>('tts');

  // theme hook
  const { colors } = useThemeContext();

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
  } = useBookNavigation(loading && lines.length === 0, currentLine, lines, loadMoreLines, canFetch, isFetchingRef, { goToLineRef });

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

  const flushUpdate = useCallback(() => {
    flushBook();
    flushSetting();
  }, [flushBook, flushSetting]);

  const ttsFocus = useCallback(() => {
    closeSearch();
    ttsScroll();
  }, [closeSearch, ttsScroll]);

  const navigateBack = useCallback(() => {
    flushUpdate();
    navigation.goBack();
  }, [flushUpdate, navigation]);

  const handlePlayPause = useCallback(() => {
    //   if (isPlaying) {
    //     pause();
    //   } else {
    //     let startFrom = shouldReadViewLineRef.current ? viewLineRef.current : currentLineRef.current;
    //     startFrom = startFrom >= totalLines ? 0 : startFrom; // if at the end, reset to start from the first line
    //     startFromLine(startFrom);
    //     ttsFocus();
    //     // startAnimationFrame(() => scrollToLine(startFrom));
    //     play(startFrom);
    //     shouldReadViewLineRef.current = false;
    //   }
    //   // focusBody();
    // }, [currentLineRef, viewLineRef, startFromLine, ttsFocus, isPlaying, scrollToLine, totalLines, shouldReadViewLineRef, play, pause]);
  }, []);

  const handleLineClick = (index: number) => {
    startFromLine(index);
    ttsFocus();
    // if (isPlaying) {
    //   resume(index);
    // } else {
    //   play(index);
    // }
  };

  const moveToLine = useCallback(
    (index: number) => {
      if (index == currentLineRef.current) return;
      startFromLine(index);
      ttsFocus();
      // if (isPlaying) stop();
    },
    [currentLineRef, startFromLine, ttsFocus],
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
  // useEffect(() => () => stop(), [_id, stop]);

  // useEffect(() => {
  //   const handleGlobalKeyDown = (e: KeyboardEvent) => {
  //     // const activeElement = document.activeElement;
  //     // console.log(`activeElement :`, activeElement);

  //     if (e.key === 'Escape') {
  //       e.preventDefault();
  //       closeSearch();
  //       return;
  //     }

  //     if (e.key === ' ') {
  //       e.preventDefault();
  //       // handlePlayPause();
  //     }

  //     if (e.key === 'ArrowDown') {
  //       e.preventDefault();
  //       nextLine();
  //     }

  //     if (e.key === 'ArrowUp') {
  //       e.preventDefault();
  //       prevLine();
  //     }
  //   };

  //   // window.addEventListener('keydown', handleGlobalKeyDown);
  //   // return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  // }, [closeSearch, nextLine, prevLine]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large">
          <Loader />
        </ActivityIndicator>
      </SafeAreaView>
    );
  }

  if (!_id || !book) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={navigateBack}>
          <Text>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.foreground }]}>
          {book.title}
        </Text>
        <Text style={[styles.lineIndicator, { color: colors.mutedForeground }]}>
          {currentLine}/{book.totalLines}
        </Text>
      </View>

      {/* Play controls */}
      {/* <View style={styles.playControls}>
          <TouchableOpacity style={[styles.playButton, false && styles.playButtonActive]} onPress={handlePlayPause}>
            {false ? <Pause size={24} color="#fff" /> : <Play size={24} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View> */}

      <CommonContext.Provider
        value={{
          isPlaying: false,
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
                {/* Start of Reading Area */}
                {pageView === 'scroll' ? (
                  <BookScrollView
                    scrollViewRef={scrollViewRef}
                    onScroll={onScroll}
                    onLayout={onLayout}
                    onContentSizeChange={onContentSizeChange}
                    recordLineLayout={recordLineLayout}
                    handleLineClick={handleLineClick}
                  />
                ) : (
                  <BookPageView
                    loadMoreLines={() => loadMoreLines(lines.length)}
                    canFetch={canFetch}
                    isFetchingRef={isFetchingRef}
                    loadingMore={loadingMore}
                    hasMore={hasMore}
                    goToLineRef={goToLineRef}
                    handleLineClick={handleLineClick}
                  />
                )}
              </SpeechContext.Provider>
            </SettingContext.Provider>
          </ContentContext.Provider>
        </BookContext.Provider>
      </CommonContext.Provider>
      {/* <TouchableWithoutFeedback onPress={() => setShowControls(!showControls)}>
      </TouchableWithoutFeedback> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600' },
  lineIndicator: { fontSize: 13 },
  playControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  playButton: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 30 },
  playButtonActive: {},
});
