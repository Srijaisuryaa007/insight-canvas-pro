import { DatasetColumn, QualityIssue } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Hash, 
  Type, 
  Calendar, 
  ToggleLeft,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnInspectorProps {
  columns: DatasetColumn[];
  issues?: QualityIssue[];
  selectedColumn?: string;
  onSelectColumn?: (column: string) => void;
}

const typeIcons = {
  number: Hash,
  string: Type,
  date: Calendar,
  boolean: ToggleLeft,
};

export function ColumnInspector({ 
  columns, 
  issues = [], 
  selectedColumn,
  onSelectColumn 
}: ColumnInspectorProps) {
  const getColumnIssues = (columnName: string) => {
    return issues.filter(i => i.column === columnName);
  };

  const getIssueSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/20 text-destructive';
      case 'medium': return 'bg-amber-500/20 text-amber-600';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Column Inspector</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <div className="space-y-1 p-4 pt-0">
            {columns.map(column => {
              const TypeIcon = typeIcons[column.type];
              const columnIssues = getColumnIssues(column.name);
              const hasIssues = columnIssues.length > 0;

              return (
                <div
                  key={column.name}
                  onClick={() => onSelectColumn?.(column.name)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors",
                    selectedColumn === column.name 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{column.name}</span>
                    </div>
                    {hasIssues ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {column.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {column.uniqueValues} unique
                    </Badge>
                    {column.nullable && (
                      <Badge variant="outline" className="text-xs">
                        nullable
                      </Badge>
                    )}
                  </div>

                  {/* Issues */}
                  {hasIssues && (
                    <div className="mt-2 space-y-1">
                      {columnIssues.map((issue, idx) => (
                        <div 
                          key={idx}
                          className={cn(
                            "text-xs px-2 py-1 rounded",
                            getIssueSeverityColor(issue.severity)
                          )}
                        >
                          {issue.type}: {issue.count} ({issue.percentage}%)
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sample Values */}
                  {selectedColumn === column.name && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Sample values:</p>
                      <div className="flex flex-wrap gap-1">
                        {column.sampleValues.slice(0, 3).map((val, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-mono">
                            {String(val).slice(0, 20)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
