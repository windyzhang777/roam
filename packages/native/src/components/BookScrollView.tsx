import { useBookContext, useContentContext } from '@/config/contexts';
import { DELETE_MARKER, IMAGE_MARKER } from '@audiobook/shared';
import React from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeContext } from './theme-provider';

interface BookScrollViewProps {
  scrollViewRef: React.RefObject<ScrollView | null>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onLayout: (height: number) => void;
  onContentSizeChange: (h: number) => void;
  recordLineLayout: (
    index: number,
    y: number,
    height: number,
  ) => {
    y: number;
    height: number;
  };
  handleLineClick: (index: number) => void;
}

export const BookScrollView = ({ scrollViewRef, onScroll, onLayout, onContentSizeChange, recordLineLayout, handleLineClick }: BookScrollViewProps) => {
  const { colors } = useThemeContext();
  const { currentLine } = useBookContext();
  const { lines } = useContentContext();

  return (
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
});
