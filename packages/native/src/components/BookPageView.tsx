import useBookPagination from '@/common/useBookPagination';
import { useBookContext, useContentContext, useSettingContext } from '@/config/contexts';
import { DELETE_MARKER, FONT_SIZE_DEFAULT, IMAGE_MARKER, INDENT_DEFAULT, LINE_HEIGHT_DEFAULT } from '@roam/shared';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeContext } from './theme-provider';

interface BookPageViewProps {
  loadMoreLines: () => Promise<void>;
  canFetch: boolean;
  isFetchingRef: React.RefObject<boolean>;
  loadingMore: boolean;
  hasMore: boolean;
  goToLineRef: React.RefObject<((lineIndex: number) => void | null) | null>;
  handleLineClick: (index: number) => void;
}

export const BookPageView = ({ loadMoreLines, canFetch, isFetchingRef, loadingMore, hasMore, goToLineRef, handleLineClick }: BookPageViewProps) => {
  const { colors } = useThemeContext();
  const { currentLine } = useBookContext();
  const { lines } = useContentContext();
  const { fontSize, lineHeight, paragraphSpacing, indent, alignment, pageView } = useSettingContext();

  const [animating, setAnimating] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // pagination hook
  const { currentPage, totalPages, getPageForLine, goToPage, nextPage, prevPage, goToLine, getPageLines, onContainerLayout } = useBookPagination(lines, fontSize, lineHeight, paragraphSpacing, indent);

  const pageLines = getPageLines();
  const fs = fontSize ?? FONT_SIZE_DEFAULT;
  const lh = lineHeight ?? LINE_HEIGHT_DEFAULT;
  const ind = indent ?? INDENT_DEFAULT;
  const columnStyle = { fontSize: fs, lineHeight: fs * lh, paddingLeft: ind * fs * 0.55, paddingRight: ind * fs * 0.55 };

  const animatedPageTransition = useCallback(
    (direction: 'left' | 'right', onComplete: () => void) => {
      setAnimating(true);
      const toValue = direction === 'left' ? -20 : 20;

      Animated.parallel([Animated.timing(translateX, { toValue, duration: 150, useNativeDriver: true }), Animated.timing(opacity, { toValue, duration: 150, useNativeDriver: true })]).start(() => {
        onComplete();
        translateX.setValue(direction === 'left' ? 20 : -20);
        Animated.parallel([Animated.timing(translateX, { toValue: 0, duration: 150, useNativeDriver: true }), Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true })]).start(
          () => setAnimating(false),
        );
      });
    },
    [currentPage, prevPage],
  );

  const animatedPrevPage = useCallback(() => {
    if (currentPage <= 0 || animating) return;

    animatedPageTransition('right', prevPage);
  }, [currentPage, animating, animatedPageTransition, prevPage]);

  const animatedNextPage = useCallback(() => {
    if (currentPage >= totalPages - 1 || animating) return;

    animatedPageTransition('left', nextPage);
  }, [currentPage, animating, animatedPageTransition, nextPage]);

  // Expose goToLine to parent for nav
  useEffect(() => {
    goToLineRef.current = goToLine;
  }, [goToLine, goToLineRef]);

  // Sync pagination state to store
  // useEffect(() => {
  //   paginationStore.set(currentPage, totalPages);
  // }, [currentPage, totalPages]);

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

  return (
    <View style={styles.container}>
      {/* Page Content Area */}
      <View
        style={styles.contentArea}
        onLayout={(e: LayoutChangeEvent) => {
          const { height, width } = e.nativeEvent.layout;
          onContainerLayout(height, width);
        }}
      >
        <Animated.View style={[styles.pageContent, { transform: [{ translateX }], opacity }]}>
          {/* Page Number */}
          <Text style={[styles.pageNumber, { color: colors.mutedForeground }]}>{currentPage + 1}</Text>

          {pageLines.map((lineIndex: number) => {
            const line = lines[lineIndex];
            const isImage = line.startsWith(IMAGE_MARKER);
            const isDeleted = line.startsWith(DELETE_MARKER);

            if (isImage || isDeleted) return null;

            return (
              <TouchableOpacity key={lineIndex} activeOpacity={0.7} onPress={() => handleLineClick(lineIndex)}>
                <Text style={[styles.bookText, columnStyle, lineIndex === currentLine && { backgroundColor: colors.highlight }]}>{line}</Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>

      {/* Page Navigation */}
      <View style={styles.tabZoneContainer} pointerEvents="box-none">
        <Pressable style={styles.tabZonePrev} onPress={animatedPrevPage} />
        <View style={styles.tabZoneCenter} />
        <Pressable style={styles.tabZoneNext} onPress={animatedNextPage} />
      </View>

      {/* Page Indicator */}
      <View style={styles.pageIndicator}>
        <Text style={[styles.pageIndicatorText, { color: colors.mutedForeground }]}>
          {currentPage + 1} / {totalPages}
        </Text>
      </View>

      {/* Loading Indicator */}
      {loadingMore && (
        <View style={styles.loadingIndicator}>
          <ActivityIndicator size="small" color={colors.mutedForeground} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading more...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  contentArea: { flex: 1, overflow: 'hidden', paddingHorizontal: 20 },
  pageContent: { flex: 1, paddingTop: 24, paddingBottom: 8 },
  pageNumber: { position: 'absolute', top: 4, left: 4, fontSize: 11, opacity: 0.5 },
  bookText: { textAlign: 'left', marginBottom: 4, paddingVertical: 2, paddingHorizontal: 4, borderRadius: 4 },
  tabZoneContainer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  tabZonePrev: { width: '25%', height: '100%' },
  tabZoneCenter: { width: '50%', height: '100%' },
  tabZoneNext: { width: '25%', height: '100%' },
  pageIndicator: { position: 'absolute', bottom: 8, alignSelf: 'center' },
  pageIndicatorText: { fontSize: 12 },
  loadingIndicator: { position: 'absolute', bottom: 28, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 },
  loadingText: { fontSize: 12 },
});
