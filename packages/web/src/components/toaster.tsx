import { Button } from '@/components//ui/button';
import type { Chapter } from '@audiobook/shared';
import { AudioLines, Undo } from 'lucide-react';

export const renderDeleteToaster = (index: number, onClick: () => Promise<void>): React.ReactNode => (
  <Button variant="ghost" id="indicator-message" onClick={onClick} className=" z-20 p-2 truncate absolute top-25 left-2/3 px-4 py-1 text-sm justify-start bg-highlight">
    <Undo size={16} className="hidden md:block" />
    <span className="font-semibold whitespace-nowrap">UNDO delete line {index}</span>
  </Button>
);

export const renderRateToaster = (rate: number): React.ReactNode => (
  <>
    <AudioLines size={16} className="hidden md:block" />
    <span className="font-semibold whitespace-nowrap">{rate}x</span>
  </>
);

export const renderChapterToaster = (chapter: Chapter): React.ReactNode => {
  if (!chapter?.title) return <></>;

  return <span className="font-semibold whitespace-nowrap">{chapter.title}</span>;
};
