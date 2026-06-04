import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton — animated loading placeholder blocks
// Uses the .skeleton CSS class (defined in index.css) for the wave animation.
// ─────────────────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton rounded-lg', className)}
      style={style}
      aria-hidden="true"
    />
  );
}

// ── Preset shapes ─────────────────────────────────────────────────────────────

/** Single chat bubble placeholder */
export function SkeletonBubble({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn('flex gap-3 items-start', isUser && 'flex-row-reverse')}>
      <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
      <div className={cn('flex flex-col gap-1.5 max-w-[60%]', isUser && 'items-end')}>
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-10 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** Task card placeholder */
export function SkeletonTaskCard() {
  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center gap-2">
        <Skeleton className="w-3 h-3 rounded-full shrink-0" />
        <Skeleton className="h-3 flex-1 rounded-md" />
        <Skeleton className="w-4 h-4 rounded-md shrink-0" />
      </div>
      <Skeleton className="h-2.5 w-3/4 rounded-md ml-5" />
      <div className="flex items-center gap-2 ml-5">
        <Skeleton className="h-2 w-16 rounded-md" />
        <Skeleton className="h-2 w-12 rounded-md" />
      </div>
    </div>
  );
}

/** Document card placeholder */
export function SkeletonDocCard() {
  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-start justify-between">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-lg" />
      </div>
      <Skeleton className="h-3.5 w-4/5 rounded-md" />
      <Skeleton className="h-3 w-full rounded-md" />
      <Skeleton className="h-3 w-2/3 rounded-md" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-2.5 w-20 rounded-md" />
        <Skeleton className="h-2.5 w-12 rounded-md" />
      </div>
    </div>
  );
}

/** Full chat loading state — several bubbles */
export function SkeletonChat() {
  return (
    <div className="flex-1 px-4 py-4 space-y-5">
      <SkeletonBubble isUser />
      <SkeletonBubble />
      <SkeletonBubble isUser />
      <SkeletonBubble />
      <SkeletonBubble isUser />
    </div>
  );
}

/** Kanban column loading state */
export function SkeletonKanban() {
  return (
    <div className="grid grid-cols-3 gap-3 flex-1">
      {[3, 2, 1].map((count, col) => (
        <div key={col} className="space-y-2">
          <Skeleton className="h-8 w-full rounded-t-xl" />
          <div
            className="rounded-b-xl p-2 space-y-2"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            {Array.from({ length: count }).map((_, i) => (
              <SkeletonTaskCard key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Documents grid loading state */
export function SkeletonDocs() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonDocCard key={i} />
      ))}
    </div>
  );
}
