import { ScrapingBook } from '@/common/useBookScrape';
import { UploadingBook } from '@/common/useBookUpload';
import { useThemeContext } from '@/components/theme-provider';
import { BASE_URL } from '@/services/config';
import { Book, BookAction, calculateProgress, formatLocaleDateString, getBookActionLabel } from '@roam/shared';
import { TFunction } from 'i18next';
import { BadgeCheck, BellRing, CircleChevronRight, CircleMinus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BookItemProps {
  book: Book;
  hasNewChapters: boolean;
  updateChapters: () => Promise<Book | null>;
  canAction: BookAction['type'];
  openAction: (type: BookAction['type'], book: Book) => void;
  onPress: () => void;
}

export const BookItem = ({ book, hasNewChapters, updateChapters, canAction, openAction, onPress }: BookItemProps) => {
  const { colors } = useThemeContext();
  const { t } = useTranslation();
  const coverUrl = book.coverPath ? `${BASE_URL}${book.coverPath}` : '';
  const progress = calculateProgress(book.currentLine, book.totalLines);

  return (
    <TouchableOpacity onPress={onPress} onLongPress={() => showContextMenu(book, canAction, openAction, t)} activeOpacity={0.7} style={styles.card}>
      <View style={styles.imageContainer}>
        {book.coverPath ? (
          <Image source={{ uri: coverUrl }} style={styles.coverImage} />
        ) : (
          <>
            <BookItemPlaceholder title={book.title} author={book.author} />
            <View style={styles.coverBorder} pointerEvents="none" />
          </>
        )}
      </View>

      {book.source === 'web' && hasNewChapters ? (
        <TouchableOpacity onPress={updateChapters} style={styles.bellButton}>
          <BellRing size={14} color="#d97706" />
        </TouchableOpacity>
      ) : null}

      {/* Badge / Progress Indicator */}
      {book.lastCompleted ? (
        <View style={styles.badgeRow} pointerEvents="none">
          <BadgeCheck strokeWidth={1} size={14} fill={colors.primary} color={colors.background} />
          <Text numberOfLines={1} style={[styles.badgeText, { color: colors.mutedForeground }]}>
            {formatLocaleDateString(new Date(book.lastReadAt || book.updatedAt))}
          </Text>
        </View>
      ) : book.currentLine === 0 ? (
        <View style={styles.badgeRow} pointerEvents="none">
          <CircleChevronRight strokeWidth={1} size={14} fill="#16a34a" color={colors.background} />
          <Text numberOfLines={1} style={[styles.badgeText, { color: colors.foreground }]}>
            {book.title}
          </Text>
        </View>
      ) : (
        <View style={styles.badgeRow} pointerEvents="none">
          <View style={[styles.progressPill, { borderColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.muted, width: `${progress}%` }]} />
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>{progress}%</Text>
          </View>
          <Text numberOfLines={1} style={[styles.badgeText, { color: colors.foreground }]}>
            {book.title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const showContextMenu = (book: Book, canAction: BookAction['type'], openAction: (type: BookAction['type'], book: Book) => void, t: TFunction) => {
  const progressLabel = getBookActionLabel(canAction, t, 'menuLabel');
  const renameLabel = getBookActionLabel('edit', t, 'menuLabel');
  const removeabel = getBookActionLabel('delete', t, 'menuLabel');
  const options = [progressLabel, renameLabel, removeabel, 'Cancel'];
  const destructiveButtonIndex = 2;
  const cancelButtonIndex = 3;

  const handleAction = (index: number) => {
    switch (index) {
      case 0:
        openAction(canAction, book);
        break;
      case 1:
        openAction('edit', book);
        break;
      case 2:
        openAction('delete', book);
        break;
    }
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex, destructiveButtonIndex }, handleAction);
  }
};

interface BookItemUploadingProps {
  upload: UploadingBook;
  onRemove: () => void;
}

export const BookItemUploading = ({ upload, onRemove }: BookItemUploadingProps) => {
  const { colors } = useThemeContext();
  const { fileName, status, progress, error, book } = upload;
  const coverUrl = book?.coverPath ? `${BASE_URL}${book.coverPath}` : '';

  return (
    <TouchableOpacity onPress={onRemove} style={styles.card} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.coverImage} />
        ) : (
          <>
            <BookItemPlaceholder title={fileName} author={book?.author} />
            <View style={styles.coverBorder} pointerEvents="none" />
          </>
        )}

        {(status === 'uploading' || status === 'error') && (
          <View style={styles.overlay}>
            <CircleMinus size={24} color="rgba(255,255,255,0.5" />
          </View>
        )}
      </View>

      {status === 'uploading' && (
        <View style={styles.badgeRow}>
          <Text numberOfLines={1} style={[styles.badgeText, { color: colors.mutedForeground }]}>
            {Math.round(progress.percentage)}% uploaded
          </Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.badgeRow}>
          <Text numberOfLines={3} style={[styles.badgeText, { color: colors.destructive }]}>
            {error || 'Upload failed'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface BookItemScrapingProps {
  scrape: ScrapingBook;
  onRemove: () => void;
}

export const BookItemScraping = ({ scrape, onRemove }: BookItemScrapingProps) => {
  const { colors } = useThemeContext();
  const { title, status, progress, error, book } = scrape;
  const coverUrl = book?.coverPath ? `${BASE_URL}${book.coverPath}` : '';

  return (
    <TouchableOpacity onPress={onRemove} style={styles.card} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.coverImage} />
        ) : (
          <>
            <BookItemPlaceholder title={title} author={book?.author} />
            <View style={styles.coverBorder} pointerEvents="none" />
          </>
        )}

        {(status === 'scraping' || status === 'error') && (
          <View style={styles.overlay}>
            <CircleMinus size={24} color="rgba(255,255,255,0.5" />
          </View>
        )}
      </View>

      {status === 'scraping' && (
        <View style={styles.badgeRow}>
          <Text numberOfLines={1} style={[styles.badgeText, { color: colors.mutedForeground }]}>
            {Math.round(progress.percentage)}% scraped
          </Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.badgeRow}>
          <Text numberOfLines={3} style={[styles.badgeText, { color: colors.destructive }]}>
            {error || 'Scrape failed'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface BookItemPlaceholderProps {
  title: string;
  author: string | undefined;
}

export const BookItemPlaceholder = ({ title, author }: BookItemPlaceholderProps) => (
  <View style={styles.placeholder}>
    <View style={styles.placeholderInner}>
      <Text style={styles.placeholderText} numberOfLines={4}>
        {title}
        {author ? `(${author})` : ''}
      </Text>
    </View>
  </View>
);

const CARD_WIDTH = 100;
const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, aspectRatio: 4 / 7, borderRadius: 6, overflow: 'hidden', paddingTop: 8, paddingBottom: 30, marginHorizontal: 4 },
  imageContainer: { flex: 1, overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3', justifyContent: 'center', alignItems: 'center' },
  bellButton: { position: 'absolute', top: 36, left: 12, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  badgeRow: { position: 'absolute', bottom: 8, left: 0, flexDirection: 'row', alignItems: 'center', gap: 1 },
  badgeText: { fontSize: 11, flex: 1 },
  progressPill: { borderRadius: 4, borderWidth: 1, height: '100%', paddingHorizontal: 4, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 2 },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  progressText: { fontSize: 8, fontWeight: '500', zIndex: 1 },
  placeholder: { flex: 1, backgroundColor: '#0c2340', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 32, overflow: 'hidden' },
  placeholderInner: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)', paddingVertical: 4, width: '100%', height: '100%' },
  placeholderText: { fontSize: 8, textTransform: 'uppercase', color: 'rgba(255, 240, 190, 0.9)', textAlign: 'center', letterSpacing: 2 },
  coverBorder: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)', zIndex: 2 },
});
