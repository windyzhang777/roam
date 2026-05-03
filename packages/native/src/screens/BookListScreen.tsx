import { useBookAction } from '@/common/useBookAction';
import { useBooks } from '@/common/useBooks';
import { useBookScrape } from '@/common/useBookScrape';
import { useBookUpload } from '@/common/useBookUpload';
import { useScrapeUpdates } from '@/common/useScrapeUpdates';
import { BookItem, BookItemScraping, BookItemUploading } from '@/components/BookItem';
import { ScrapeBookModal } from '@/components/BookItemModal';
import { useThemeContext } from '@/components/theme-provider';
import { Book, BookSource, getBookActionLabel } from '@audiobook/shared';
import { useNavigation } from '@react-navigation/native';
import { BookOpen, CirclePlus, Cloudy, Moon, Sun } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = BookSource | 'completed';
const TABS: Tab[] = ['local', 'web', 'completed'];

export const BookListScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { theme, setTheme, colors } = useThemeContext();
  const [activeTab, setActiveTab] = useState<Tab>('local');
  const pagerRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();

  // data hook
  const { books, loading, loadBooks, updateBook, deleteBook, addBook } = useBooks();

  // action hook - action on book menu & modal
  const { pendingAction, closeAction, openAction } = useBookAction();

  // upload hook - upload local book
  const { uploads, startUpload, removeUpload } = useBookUpload((book: Book) => addBook(book));

  // scrape hook - scrape web book
  const { scrapeUrl, setScrapeUrl, scrapes, isScraping, startScrape, removeScrape } = useBookScrape(
    () => closeAction(),
    (book: Book) => addBook(book),
  );

  // scrape web book chapter updates
  const { updatedBooks, updateChapters } = useScrapeUpdates(books);

  const booksCompleted = useMemo(
    () =>
      books
        .filter((book) => book.lastCompleted)
        .sort((a, b) => {
          if (!a.lastReadAt) return 1;
          if (!b.lastReadAt) return -1;
          return b.lastReadAt.localeCompare(a.lastReadAt);
        }),
    [books],
  );

  const localBooks = useMemo(
    () =>
      books
        .filter((book) => !book.lastCompleted && book.source !== 'web')
        .sort((a, b) => {
          if (!a.updatedAt) return 1;
          if (!b.updatedAt) return -1;
          return b.updatedAt.localeCompare(a.updatedAt);
        }),
    [books],
  );

  const webBooks = useMemo(
    () =>
      books
        .filter((book) => !book.lastCompleted && book.source === 'web')
        .sort((a, b) => {
          if (!a.updatedAt) return 1;
          if (!b.updatedAt) return -1;
          return b.updatedAt.localeCompare(a.updatedAt);
        }),
    [books],
  );

  const toggleTab = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      pagerRef.current?.scrollTo({ x: TABS.indexOf(tab) * width, animated: true });
    },
    [width],
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large">
          <Text style={{ color: colors.foreground }}>Loading books...</Text>
        </ActivityIndicator>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Theme Settings */}
      <View style={[styles.header]}>
        <View style={{ flex: 1 }} />
        <View style={[styles.themeToggle, { borderWidth: 0 }]}>
          {theme === 'dark' && (
            <TouchableOpacity onPress={() => setTheme('light')} style={[styles.themeButton]}>
              <Sun size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          )}
          {theme === 'light' && (
            <TouchableOpacity onPress={() => setTheme('dark')} style={[styles.themeButton]}>
              <Moon size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* File Control */}
      <View style={styles.control}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Books</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => {
            toggleTab('local');
            startUpload();
          }}
          style={styles.uploadButton}
        >
          <CirclePlus size={16} color={colors.foreground} />
          <Text style={[styles.uploadText, { color: colors.foreground }]}>Upload</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            toggleTab('web');
            openAction('scrape', books[0]);
          }}
          style={styles.uploadButton}
        >
          <Cloudy size={16} color={colors.foreground} />
          <Text style={[styles.uploadText, { color: colors.foreground }]}>Web</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => {
            toggleTab('local');
          }}
          style={[styles.tab]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'local' ? colors.primary : colors.mutedForeground }]}>Local ({localBooks.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            toggleTab('web');
          }}
          style={[styles.tab]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'web' ? colors.primary : colors.mutedForeground }]}>Web ({webBooks.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            toggleTab('completed');
          }}
          style={[styles.tab]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'completed' ? colors.primary : colors.mutedForeground }]}>Completed ({booksCompleted.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveTab(TABS[page] ?? 'local');
        }}
      >
        {/* Local Books */}
        <ScrollView style={{ width }} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBooks} />}>
          <View style={styles.grid}>
            {/* Uploading Books */}
            {uploads.map((upload) => (
              <BookItemUploading key={upload.id} upload={upload} onRemove={() => removeUpload(upload.id)} />
            ))}
            {localBooks.length === 0 && uploads.length === 0 && (
              <View style={styles.emptyState}>
                <BookOpen size={48} color={colors.mutedForeground} style={{ opacity: 0.5, marginBottom: 16 }} />
                <Text style={{ color: colors.mutedForeground }}>Upload a new book!</Text>
              </View>
            )}
            {localBooks.map((book) => (
              <BookItem
                key={book._id}
                book={book}
                hasNewChapters={updatedBooks[book._id] > 0}
                updateChapters={() => updateChapters(book._id)}
                canAction="markCompleted"
                openAction={openAction}
                onPress={() => navigation.navigate('BookReader', { bookId: book._id })}
              />
            ))}
          </View>
        </ScrollView>

        {/* Web Read */}
        <ScrollView style={{ width }} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBooks} />}>
          <View style={styles.grid}>
            {/* Scraping Books */}
            {scrapes.map((scrape) => (
              <BookItemScraping key={scrape.id} scrape={scrape} onRemove={() => removeUpload(scrape.id)} />
            ))}
            {webBooks.length === 0 && scrapes.length === 0 && (
              <View style={styles.emptyState}>
                <BookOpen size={48} color={colors.mutedForeground} style={{ opacity: 0.5, marginBottom: 16 }} />
                <Text style={{ color: colors.mutedForeground }}>No web books yet!</Text>
              </View>
            )}
            {webBooks.map((book) => (
              <BookItem
                key={book._id}
                book={book}
                hasNewChapters={updatedBooks[book._id] > 0}
                updateChapters={() => updateChapters(book._id)}
                canAction="markCompleted"
                openAction={openAction}
                onPress={() => navigation.navigate('BookReader', { bookId: book._id })}
              />
            ))}
          </View>
        </ScrollView>

        {/* Books Completed */}
        <ScrollView style={{ width }} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBooks} />}>
          <View style={styles.grid}>
            {booksCompleted.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={{ color: colors.mutedForeground }}>No completed books yet!</Text>
              </View>
            )}
            {booksCompleted.map((book) => (
              <BookItem
                key={book._id}
                book={book}
                hasNewChapters={updatedBooks[book._id] > 0}
                updateChapters={() => updateChapters(book._id)}
                canAction="resetProgress"
                openAction={openAction}
                onPress={() => navigation.navigate('BookReader', { bookId: book._id })}
              />
            ))}
          </View>
        </ScrollView>

        {/* Books Completed */}
        <ScrollView style={{ width }} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBooks} />}>
          <View style={styles.grid}>
            {booksCompleted.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={{ color: colors.mutedForeground }}>No completed books yet.</Text>
              </View>
            )}
            {booksCompleted.map((book) => (
              <BookItem
                key={book._id}
                book={book}
                hasNewChapters={updatedBooks[book._id] > 0}
                updateChapters={() => updateChapters(book._id)}
                canAction="resetProgress"
                openAction={openAction}
                onPress={() => navigation.navigate('BookReader', { bookId: book._id })}
              />
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      {/* No Books */}
      {books.length === 0 && (
        <View style={styles.emptyState}>
          <BookOpen size={48} color={colors.mutedForeground} style={{ opacity: 0.5, marginBottom: 16 }} />
          <Text style={{ color: colors.mutedForeground }}>No books yet. Upload your first book to get started!</Text>
        </View>
      )}

      {/* Web Book Modal */}
      {!!pendingAction && (
        <ScrapeBookModal
          open={pendingAction.type === 'scrape' && !isScraping}
          onClose={closeAction}
          title={getBookActionLabel(pendingAction.type, t, 'modalTitle')}
          scrapeUrl={scrapeUrl}
          setScrapeUrl={setScrapeUrl}
          onConfirm={startScrape}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 2, marginBottom: 8, marginTop: 12 },
  themeToggle: { flexDirection: 'row', borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  themeButton: { paddingHorizontal: 12, paddingVertical: 8 },
  control: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
  uploadText: { fontWeight: '500' },

  tabBar: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 2 },
  tab: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  horizontalScroll: { paddingHorizontal: 24, gap: 12, paddingBottom: 24 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
});
