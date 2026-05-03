import type { UploadingBook } from '@/common/useBookUpload';
import { BindingLine, BookItemPlaceholder } from '@/components/BookItem';
import { CircleMinus } from 'lucide-react';

interface BookItemUploadingProps {
  upload: UploadingBook;
  onRemove: () => void;
}

export const BookItemUploading = ({ upload, onRemove }: BookItemUploadingProps) => {
  const { fileName, status, progress, error, book } = upload;
  const coverPath = book?.coverPath ? (book.coverPath.startsWith('blob:') || book.coverPath.startsWith('data:') ? book.coverPath : `${import.meta.env.VITE_API_URL}${book.coverPath}`) : '';

  return (
    <div
      role="status"
      key={`uploading-${fileName}`}
      aria-label={`Uploading ${fileName}`}
      className="relative aspect-4/7 w-40 rounded-md overflow-hidden pt-8 pb-10 px-2 transition-all cursor-pointer group"
    >
      <div className="relative w-full h-full overflow-hidden">
        {coverPath ? (
          <>
            <img src={coverPath} alt={`${fileName} cover`} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = '')} />
            <BindingLine />
          </>
        ) : (
          <BookItemPlaceholder title={fileName} author={book?.author} />
        )}

        {/* Cancel Overlay */}
        {(status === 'uploading' || status === 'error') && (
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
            title={`${status === 'error' ? 'Remove' : 'Cancel upload'}`}
            className="absolute inset-0 bg-background/10 flex flex-col items-center justify-center group-hover:bg-background/30 transition-bg-background cursor-pointer"
          >
            <CircleMinus className="text-background/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {status === 'uploading' && (
        <span className="absolute bottom-3.5 left-2 w-full text-[10px] text-muted-foreground flex items-center gap-1 text-left pointer-events-none">
          <span className="w-full truncate justify-start animate-pulse">{Math.round(progress.percentage)}% uploaded</span>
        </span>
      )}

      {/* Error Indicator */}
      {status === 'error' && (
        <span title={error || 'Upload failed'} className="absolute bottom-0.5 left-2 text-[10px] text-destructive line-clamp-3 text-center">
          {error || 'Upload failed'}
        </span>
      )}
    </div>
  );
};
