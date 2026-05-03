import useBookNavigation from '@/common/useBookNavigation';
import { useBookReader } from '@/common/useBookReader';
import { useBookSearch } from '@/common/useBookSearch';
import { useThemeContext } from '@/components/theme-provider';
import { getChapterIndex } from '@/utils';
import { DELETE_MARKER, IMAGE_MARKER } from '@audiobook/shared';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Loader, Pause, Play } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  // const {
  //   loading: loadingSetting,
  //   fontSize,
  //   setFontSize,
  //   rate,
  //   setRate,
  //   setVoice,
  //   selectedVoice,
  //   lineHeight,
  //   setLineHeight,
  //   paragraphSpacing,
  //   setParagraphSpacing,
  //   indent,
  //   setIndent,
  //   alignment,
  //   setAlignment,
  //   flushSetting,
  //   availableVoices,
  // } = useReaderSettings(_id, lang);

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
  } = useBookNavigation(currentLine, lines, loadMoreLines, canFetch, isFetchingRef);

  const startFromLine = useCallback(
    (index: number) => {
      updateCurrentLine(index);
      updateViewLine(index);
    },
    [updateCurrentLine, updateViewLine],
  );

  // speech hook
  // const { isPlaying, play, pause, resume, stop } = useBookSpeech(_id, lines, lang, totalLines, selectedVoice, rate, currentLine, startFromLine, loadMoreLines, onBookCompleted);

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

  const loading = useMemo(() => !_id || loadingBook, [_id, loadingBook]);

  // const flushUpdate = useCallback(() => {
  //   flushBook();
  //   flushSetting();
  // }, [flushBook, flushSetting]);

  const ttsFocus = useCallback(() => {
    closeSearch();
    ttsScroll();
  }, [closeSearch, ttsScroll]);

  const navigateBack = useCallback(() => {
    flushBook();
    navigation.goBack();
  }, [flushBook, navigation]);

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
    [currentLineRef, startFromLine, ttsFocus, stop],
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
        // handlePlayPause();
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
  }, [closeSearch, nextLine, prevLine]);

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
    <SafeAreaView style={[styles.container, styles.center, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.textSizeControls}>
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <ArrowLeft size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.foreground }]}>
            {book.title}
          </Text>
          <Text style={[styles.header, { color: colors.mutedForeground }]}>
            {currentLine}/{book.totalLines}
          </Text>
        </View>

        {/* Play controls */}
        <View style={styles.playControls}>
          <TouchableOpacity style={[styles.playButton, false && styles.playButtonActive]} onPress={handlePlayPause}>
            {false ? <Pause size={24} color="#fff" /> : <Play size={24} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
      {/* Reading area */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={100}
        onScroll={onScroll}
        onLayout={(e: LayoutChangeEvent) => onLayout(e.nativeEvent.layout.height)}
        // bounces={false}
        onContentSizeChange={onContentSizeChange}
      >
        {lines.map((line, index) => {
          const isImage = line.startsWith(IMAGE_MARKER);
          const isDeleted = line.startsWith(DELETE_MARKER);

          if (isImage || isDeleted) return null;

          return (
            <View
              key={index}
              onLayout={(e: LayoutChangeEvent) => {
                recordLineLayout(index, e.nativeEvent.layout.y, e.nativeEvent.layout.height);
              }}
              collapsable={false}
            >
              <TouchableOpacity activeOpacity={0.7} onPress={() => handleLineClick(index)}>
                <Text
                  style={[
                    styles.bookText,
                    // { fontSize: fontSize ?? 18, lineHeight: (fontSize ?? 18) * (lineHeight ?? 2), color: colors.foreground },
                    index === currentLine && { backgroundColor: colors.highlight },
                  ]}
                >
                  {line}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
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
  scrollContent: { paddingHorizontal: 20, paddingVertical: 24 },
  bookText: { textAlign: 'left', marginBottom: 4, paddingVertical: 2, paddingHorizontal: 4, borderRadius: 4 },
  loadingMore: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16, fontSize: 13 },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  textSizeLabel: { fontSize: 14, fontWeight: '600', minWidth: 30, textAlign: 'center' },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorText: { fontSize: 18 },
  readingArea: { flex: 1 },
  highlightedLine: { paddingHorizontal: 4, borderRadius: 8 },
  controlBar: { borderTopWidth: 1, paddingVertical: 12, paddingHorizontal: 16 },
  textSizeControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12, gap: 16 },
  playControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  playButton: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 30 },
  playButtonActive: {},
});
