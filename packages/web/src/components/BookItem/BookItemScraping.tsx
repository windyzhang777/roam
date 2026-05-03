import type { ScrapingBook } from '@/common/useBookScrape';
import { BindingLine, BookItemPlaceholder } from '@/components/BookItem';
import { CircleMinus } from 'lucide-react';

interface BookItemScrapingProps {
  scrape: ScrapingBook;
  onRemove: () => void;
}

export const BookItemScraping = ({ scrape, onRemove }: BookItemScrapingProps) => {
  const { title, status, progress, error, book } = scrape;
  const coverPath = book?.coverPath ? (book.coverPath.startsWith('blob:') || book.coverPath.startsWith('data:') ? book.coverPath : `${import.meta.env.VITE_API_URL}${book.coverPath}`) : '';

  return (
    <div role="status" key={`scraping-${title}`} aria-label={`scraping ${title}`} className={`relative aspect-4/7 w-40 rounded-md overflow-hidden pt-8 pb-10 px-2 transition-all cursor-pointer group`}>
      <div className="relative w-full h-full overflow-hidden">
        {coverPath ? (
          <>
            <img src={coverPath} alt={`${title} cover`} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = '')} />
            <BindingLine />
          </>
        ) : (
          <BookItemPlaceholder title={title} author={book?.author} />
        )}

        {/* Cancel Overlay */}
        {(status === 'scraping' || status === 'error') && (
          <div
            tabIndex={0}
            onClick={onRemove}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRemove();
              }
            }}
            title={`${status === 'error' ? 'Remove' : 'Cancel scrape'}`}
            className="absolute inset-0 bg-background/10 flex flex-col items-center justify-center group-hover:bg-background/30 transition-bg-background cursor-pointer"
          >
            <CircleMinus className="text-background/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {status === 'scraping' && (
        <span className="absolute bottom-3.5 left-2 w-full text-[10px] text-muted-foreground flex items-center gap-1 text-left pointer-events-none">
          <span className="w-full truncate justify-start animate-pulse">{progress.totalChunks > 0 ? `Scraping Chapter ${progress.currentChunk + 1}...` : 'Starting...'}</span>
        </span>
      )}

      {/* Error Indicator */}
      {status === 'error' && (
        <span className="absolute bottom-3.5 left-2 w-full text-[10px] text-destructive flex items-center gap-1 text-left pointer-events-none">
          <span title={error || 'Scrape failed'} className="w-full truncate justify-start">
            {error || 'Scrape failed'}
          </span>
        </span>
      )}
    </div>
  );
};
