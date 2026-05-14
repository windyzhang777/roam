import { api } from '@/services/api';
import { ALL_LINES, type BookMark, type Chapter } from '@roam/shared';

const localKey = (title: string, type: string) => `${title}:${type}`;

const saveToLocal = <T>(title: string | undefined, type: string, data: T[]) => {
  if (!title || data.length === 0) return;
  const value = JSON.stringify({ title, [type]: data, savedAt: new Date().toISOString() });
  localStorage.setItem(localKey(title, type), value);
  alert(`${type.charAt(0).toUpperCase() + type.slice(1)} for [${title}] saved!`);
};

const loadFromLocal = <T>(title: string, type: string): T[] | undefined => {
  const found = localStorage.getItem(localKey(title, type));
  if (!found) {
    alert(`${type.charAt(0).toUpperCase() + type.slice(1)} for [${title}] not found!`);
    return;
  }
  try {
    const parsed = JSON.parse(found);
    const data: T[] = parsed?.[type] || [];
    if (!Array.isArray(data) || data.length === 0) return;
    return data;
  } catch (error) {
    console.error(`❌ Failed to parse ${type}} from local:`, error);
  }
};

const repairIndex = (lines: string[], oldIndex: number, text: string): number | undefined => {
  const searchPhrase = text.endsWith('...') ? text.slice(0, -3) : text;
  if (lines[oldIndex]?.startsWith(searchPhrase)) return oldIndex;

  console.warn(`Index mismatch. Searching for: "${searchPhrase.slice(0, 20)}..."`);
  const newIndex = lines.findIndex((line: string) => line.startsWith(searchPhrase));
  if (newIndex !== -1) return newIndex;

  console.error(`Could not find text in book: "${searchPhrase.slice(0, 20)}..."`);
  return;
};

const fetchLines = async (_id: string) => {
  const { lines } = await api.books.getContent(_id, 0, ALL_LINES);
  return lines?.length > 0 ? lines : undefined;
};

export function useSaveToLocal() {
  const saveBookmarksToLocal = (title: string | undefined, bookmarks: BookMark[]) => {
    saveToLocal(title, 'bookmarks', bookmarks);
  };

  const importBookmarksFromLocal = async (_id: string, title: string, bookmarks: BookMark[]): Promise<BookMark[] | undefined> => {
    if (!_id || !title) return;

    const lines = await fetchLines(_id);
    if (!lines) {
      alert(`Failed to load book content for [${title}]!`);
      return;
    }

    const stored = loadFromLocal<BookMark>(title, 'bookmarks');
    if (!stored) return;

    const repaireMap = new Map<string, number>();
    bookmarks.forEach((bookmark) => repaireMap.set(bookmark.text, bookmark.index));

    for (const bookmark of stored) {
      const repairedIndex = repairIndex(lines, bookmark.index, bookmark.text);
      if (repairedIndex !== undefined) {
        repaireMap.set(bookmark.text, repairedIndex);
      }
    }

    return Array.from(repaireMap.entries())
      .map(([text, index]) => ({ index, text }))
      .sort((a, b) => a.index - b.index);
  };

  const saveChaptersToLocal = (title: string | undefined, chapters: Chapter[]) => {
    saveToLocal(title, 'chapters', chapters);
  };

  const importChaptersFromLocal = async (title: string, chapters: Chapter[]): Promise<Chapter[] | undefined> => {
    if (!title) return;
    const stored = loadFromLocal<Chapter>(title, 'chapters');
    if (!stored) return;

    const exisitingTitles = new Set(chapters.map((c) => c.title));
    const merged = [...chapters];

    for (const chapter of stored) {
      if (!exisitingTitles.has(chapter.title)) {
        merged.push(chapter);
      }
    }

    return merged.sort((a, b) => (a.startIndex ?? 0) - (b.startIndex ?? 0));
  };

  const saveHighlightsToLocal = (title: string | undefined, highlights: { indices: number[]; texts: string[] }[]) => {
    saveToLocal(title, 'highlights', highlights);
  };

  const importHighlightsFromLocal = async (_id: string, title: string, highlights: { indices: number[]; texts: string[] }[]): Promise<{ indices: number[]; texts: string[] }[] | undefined> => {
    if (!_id || !title) return;

    const lines = await fetchLines(_id);
    if (!lines) {
      alert(`Failed to load book content for [${title}]!`);
      return;
    }

    const stored = loadFromLocal<{ indices: number[]; texts: string[] }>(title, 'highlights');
    if (!stored) return;

    const existingkeys = new Set(highlights.map((h) => h.texts.join('')));
    const merged = [...highlights];

    for (const highlight of stored) {
      const key = highlight.texts.join('');
      if (existingkeys.has(key)) continue;

      const repairedIndices: number[] = [];
      let valid = true;

      for (let i = 0; i < highlight.indices.length; i++) {
        const repairedIndex = repairIndex(lines, highlight.indices[i], highlight.texts[i]);
        if (repairedIndex === undefined) {
          valid = false;
          break;
        }
        repairedIndices.push(repairedIndex);
      }

      if (valid) {
        merged.push({ indices: repairedIndices, texts: highlight.texts });
      }
    }

    return merged.sort((a, b) => a.indices[0] - b.indices[0]);
  };

  return { saveBookmarksToLocal, importBookmarksFromLocal, saveChaptersToLocal, importChaptersFromLocal, saveHighlightsToLocal, importHighlightsFromLocal };
}
