import { useData } from '@/contexts/DataContext';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function DataSyncBanner() {
  const { currentData, isDataCleaned, cleaningReport } = useData();

  if (!currentData || currentData.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 bg-destructive/5">
        <XCircle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-sm text-destructive">No data loaded — upload a dataset first</span>
      </div>
    );
  }

  const healthScore = cleaningReport?.healthScore as number | undefined;

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-lg border",
      isDataCleaned
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-amber-500/30 bg-amber-500/5"
    )}>
      {isDataCleaned ? (
        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
      )}
      <span className="text-sm">
        {isDataCleaned ? (
          <>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">Cleaned data active</span>
            <span className="text-muted-foreground"> — {currentData.length.toLocaleString()} rows</span>
            {healthScore !== undefined && (
              <span className="text-muted-foreground"> · Health Score: {healthScore}/100</span>
            )}
          </>
        ) : (
          <>
            <span className="font-medium text-amber-600 dark:text-amber-400">Original data</span>
            <span className="text-muted-foreground"> — {currentData.length.toLocaleString()} rows · Run Data Cleaning for improved results</span>
          </>
        )}
      </span>
    </div>
  );
}
