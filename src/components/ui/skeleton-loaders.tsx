import { cn } from '@/lib/utils';
import { CSSProperties } from 'react';

function Shimmer({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-muted', className)} style={style} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-7 w-48" />
          <Shimmer className="h-4 w-64" />
        </div>
        <Shimmer className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Shimmer key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Shimmer className="h-64" />
        <Shimmer className="h-64" />
      </div>
      <Shimmer className="h-48" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Shimmer className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {[1, 2, 3, 4, 5].map(j => (
            <Shimmer key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ type = 'bar' }: { type?: 'bar' | 'line' | 'pie' }) {
  return (
    <div className="p-4 space-y-4">
      <Shimmer className="h-5 w-32" />
      {type === 'bar' && (
        <div className="flex items-end gap-2 h-40">
          {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
            <Shimmer key={i} className="flex-1" style={{ height: `${h}%` }} />
          ))}
        </div>
      )}
      {type === 'line' && (
        <div className="h-40 relative">
          <Shimmer className="h-full w-full opacity-30" />
          <div className="absolute inset-x-0 top-1/3 border-t-2 border-dashed border-muted-foreground/20" />
        </div>
      )}
      {type === 'pie' && (
        <div className="flex justify-center">
          <Shimmer className="h-40 w-40 rounded-full" />
        </div>
      )}
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 p-4 border border-border rounded-lg">
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-8 w-24" />
          <Shimmer className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
