import { useState, useMemo } from 'react';
import { Search, Copy, ArrowRight, BookOpen, Zap, Flame, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { DAX_FORMULAS } from '@/lib/daxKnowledgeBase';
import { EXCEL_FORMULAS } from '@/lib/excelKnowledgeBase';
import { cn } from '@/lib/utils';

// ─── SQL Formulas ────────────────────────────────────────
const SQL_FORMULAS: Record<string, { formula: string; description: string; example: string; category: string }> = {
  select: { formula: 'SELECT col1, col2 FROM table', description: 'Retrieve specific columns from a table.', example: 'SELECT name, price FROM products', category: 'basic' },
  selectAll: { formula: 'SELECT * FROM table', description: 'Retrieve all columns from a table.', example: 'SELECT * FROM orders LIMIT 10', category: 'basic' },
  where: { formula: 'SELECT ... WHERE condition', description: 'Filter rows based on a condition.', example: "SELECT * FROM sales WHERE region = 'North'", category: 'basic' },
  orderBy: { formula: 'SELECT ... ORDER BY col ASC|DESC', description: 'Sort results by a column.', example: 'SELECT * FROM products ORDER BY price DESC', category: 'basic' },
  limit: { formula: 'SELECT ... LIMIT n', description: 'Limit the number of returned rows.', example: 'SELECT * FROM logs LIMIT 100', category: 'basic' },
  distinct: { formula: 'SELECT DISTINCT col FROM table', description: 'Return unique values only.', example: 'SELECT DISTINCT category FROM products', category: 'basic' },
  countAgg: { formula: 'SELECT COUNT(*) FROM table', description: 'Count the number of rows.', example: 'SELECT COUNT(*) AS total FROM orders', category: 'basic' },
  sumAgg: { formula: 'SELECT SUM(col) FROM table', description: 'Sum all values in a column.', example: 'SELECT SUM(revenue) AS total_rev FROM sales', category: 'basic' },
  avgAgg: { formula: 'SELECT AVG(col) FROM table', description: 'Calculate average of a column.', example: 'SELECT AVG(price) AS avg_price FROM products', category: 'basic' },
  groupBy: { formula: 'SELECT col, AGG(col2) FROM table GROUP BY col', description: 'Group rows and apply aggregation.', example: 'SELECT region, SUM(sales) FROM data GROUP BY region', category: 'intermediate' },
  having: { formula: 'SELECT ... GROUP BY ... HAVING condition', description: 'Filter groups after aggregation.', example: 'SELECT category, COUNT(*) cnt FROM products GROUP BY category HAVING cnt > 5', category: 'intermediate' },
  join: { formula: 'SELECT ... FROM t1 JOIN t2 ON t1.id = t2.id', description: 'Combine rows from two tables.', example: 'SELECT o.id, c.name FROM orders o JOIN customers c ON o.cust_id = c.id', category: 'intermediate' },
  leftJoin: { formula: 'SELECT ... FROM t1 LEFT JOIN t2 ON ...', description: 'Include all rows from the left table.', example: 'SELECT e.name, d.dept FROM employees e LEFT JOIN departments d ON e.dept_id = d.id', category: 'intermediate' },
  subquery: { formula: 'SELECT ... WHERE col IN (SELECT ...)', description: 'Use a query result as a filter.', example: 'SELECT * FROM products WHERE category_id IN (SELECT id FROM categories WHERE active = 1)', category: 'intermediate' },
  caseWhen: { formula: "CASE WHEN cond THEN val ELSE val END", description: 'Conditional logic inside a query.', example: "SELECT name, CASE WHEN score >= 90 THEN 'A' WHEN score >= 80 THEN 'B' ELSE 'C' END AS grade FROM students", category: 'intermediate' },
  coalesce: { formula: 'COALESCE(col1, col2, default)', description: 'Return first non-null value.', example: "SELECT COALESCE(nickname, full_name, 'Unknown') AS display_name FROM users", category: 'intermediate' },
  unionAll: { formula: 'SELECT ... UNION ALL SELECT ...', description: 'Combine results from two queries.', example: "SELECT name, 'customer' AS type FROM customers UNION ALL SELECT name, 'supplier' FROM suppliers", category: 'intermediate' },
  windowRank: { formula: 'RANK() OVER (ORDER BY col DESC)', description: 'Assign rank based on ordering.', example: 'SELECT name, sales, RANK() OVER (ORDER BY sales DESC) AS rank FROM reps', category: 'advanced' },
  windowRowNumber: { formula: 'ROW_NUMBER() OVER (PARTITION BY col ORDER BY col2)', description: 'Unique row number within partitions.', example: 'SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn FROM employees', category: 'advanced' },
  lag: { formula: 'LAG(col, offset) OVER (ORDER BY col2)', description: 'Access previous row value.', example: 'SELECT date, revenue, LAG(revenue, 1) OVER (ORDER BY date) AS prev_rev FROM monthly', category: 'advanced' },
  lead: { formula: 'LEAD(col, offset) OVER (ORDER BY col2)', description: 'Access next row value.', example: 'SELECT date, revenue, LEAD(revenue, 1) OVER (ORDER BY date) AS next_rev FROM monthly', category: 'advanced' },
  runningTotal: { formula: 'SUM(col) OVER (ORDER BY col2 ROWS UNBOUNDED PRECEDING)', description: 'Cumulative sum over ordered rows.', example: 'SELECT date, amount, SUM(amount) OVER (ORDER BY date) AS running_total FROM transactions', category: 'advanced' },
  cte: { formula: 'WITH cte AS (SELECT ...) SELECT ... FROM cte', description: 'Common Table Expression for readable subqueries.', example: 'WITH top_sales AS (SELECT region, SUM(amount) s FROM sales GROUP BY region) SELECT * FROM top_sales WHERE s > 10000', category: 'advanced' },
  recursiveCte: { formula: 'WITH RECURSIVE cte AS (...) SELECT ...', description: 'Recursive CTE for hierarchical data.', example: 'WITH RECURSIVE tree AS (SELECT id, parent_id, name FROM categories WHERE parent_id IS NULL UNION ALL SELECT c.id, c.parent_id, c.name FROM categories c JOIN tree t ON c.parent_id = t.id) SELECT * FROM tree', category: 'advanced' },
  pivotCase: { formula: 'SUM(CASE WHEN col = val THEN amount END)', description: 'Pivot data using conditional aggregation.', example: "SELECT product, SUM(CASE WHEN quarter = 'Q1' THEN revenue END) AS q1, SUM(CASE WHEN quarter = 'Q2' THEN revenue END) AS q2 FROM sales GROUP BY product", category: 'advanced' },
  ntile: { formula: 'NTILE(n) OVER (ORDER BY col)', description: 'Divide rows into n buckets.', example: 'SELECT name, salary, NTILE(4) OVER (ORDER BY salary DESC) AS quartile FROM employees', category: 'advanced' },
  percentRank: { formula: 'PERCENT_RANK() OVER (ORDER BY col)', description: 'Relative rank as a percentage.', example: 'SELECT name, score, ROUND(PERCENT_RANK() OVER (ORDER BY score) * 100, 1) AS pctl FROM students', category: 'advanced' },
};

// ─── Types ───────────────────────────────────────────────
type FormulaEntry = { formula: string; description: string; example: string; category: string };
type Difficulty = 'basic' | 'intermediate' | 'advanced';

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; icon: any; color: string; badgeClass: string }> = {
  basic: { label: 'Basic', icon: BookOpen, color: 'text-emerald-400', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  intermediate: { label: 'Intermediate', icon: Zap, color: 'text-amber-400', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  advanced: { label: 'Advanced', icon: Flame, color: 'text-red-400', badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

// ─── Map categories to difficulty ────────────────────────
function getDifficulty(category: string, lang: 'dax' | 'excel' | 'sql'): Difficulty {
  if (lang === 'sql') {
    if (['basic'].includes(category)) return 'basic';
    if (['intermediate'].includes(category)) return 'intermediate';
    return 'advanced';
  }
  if (lang === 'dax') {
    if (['aggregation', 'math', 'logical'].includes(category)) return 'basic';
    if (['filter', 'iterator', 'text', 'table', 'relationship'].includes(category)) return 'intermediate';
    return 'advanced'; // time, statistical, info
  }
  // excel
  if (['math', 'logical', 'text'].includes(category)) return 'basic';
  if (['conditional', 'lookup', 'date'].includes(category)) return 'intermediate';
  return 'advanced'; // array, info, financial, dynamic
}

function groupByDifficulty(formulas: Record<string, FormulaEntry>, lang: 'dax' | 'excel' | 'sql') {
  const grouped: Record<Difficulty, Array<FormulaEntry & { key: string }>> = { basic: [], intermediate: [], advanced: [] };
  Object.entries(formulas).forEach(([key, val]) => {
    const diff = getDifficulty(val.category, lang);
    grouped[diff].push({ ...val, key });
  });
  return grouped;
}

interface FormulaHubProps {
  onImportToDashboard?: (formula: string, name: string) => void;
}

export function FormulaHub({ onImportToDashboard }: FormulaHubProps) {
  const [search, setSearch] = useState('');
  const [activeLang, setActiveLang] = useState<'dax' | 'excel' | 'sql'>('dax');
  const [expandedDifficulty, setExpandedDifficulty] = useState<Record<string, boolean>>({ basic: true, intermediate: false, advanced: false });

  const formulas = useMemo(() => {
    const source = activeLang === 'dax' ? DAX_FORMULAS : activeLang === 'excel' ? EXCEL_FORMULAS : SQL_FORMULAS;
    return groupByDifficulty(source, activeLang);
  }, [activeLang]);

  const filtered = useMemo(() => {
    if (!search.trim()) return formulas;
    const q = search.toLowerCase();
    const result: Record<Difficulty, Array<FormulaEntry & { key: string }>> = { basic: [], intermediate: [], advanced: [] };
    (['basic', 'intermediate', 'advanced'] as Difficulty[]).forEach(diff => {
      result[diff] = formulas[diff].filter(f =>
        f.key.toLowerCase().includes(q) ||
        f.formula.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    });
    return result;
  }, [formulas, search]);

  const totalCount = filtered.basic.length + filtered.intermediate.length + filtered.advanced.length;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const handleImport = (formula: FormulaEntry & { key: string }) => {
    if (onImportToDashboard) {
      onImportToDashboard(formula.example, formula.key);
      toast({ title: 'Imported to Dashboard', description: `${formula.key} measure added to semantic model.` });
    } else {
      // Save to localStorage measures
      const MEASURES_KEY = 'datavora_measures';
      const stored = localStorage.getItem(MEASURES_KEY);
      const measures = stored ? JSON.parse(stored) : [];
      measures.push({ name: formula.key, formula: formula.example, createdAt: new Date().toISOString() });
      localStorage.setItem(MEASURES_KEY, JSON.stringify(measures));
      toast({ title: 'Saved as Measure', description: `${formula.key} added to your semantic model.` });
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Formula Hub
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{totalCount} formulas across DAX, Excel & SQL</p>
        </div>
      </div>

      {/* Language Tabs */}
      <Tabs value={activeLang} onValueChange={v => setActiveLang(v as any)} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="dax" className="gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" />DAX
            </TabsTrigger>
            <TabsTrigger value="excel" className="gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" />Excel
            </TabsTrigger>
            <TabsTrigger value="sql" className="gap-1.5 text-xs">
              <Flame className="h-3.5 w-3.5" />SQL
            </TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search formulas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {(['dax', 'excel', 'sql'] as const).map(lang => (
          <TabsContent key={lang} value={lang} className="flex-1 overflow-hidden mt-3">
            <ScrollArea className="h-[calc(100vh-22rem)]">
              <div className="space-y-3 pr-2">
                {(['basic', 'intermediate', 'advanced'] as Difficulty[]).map(diff => {
                  const items = filtered[diff];
                  const config = DIFFICULTY_CONFIG[diff];
                  const DiffIcon = config.icon;
                  const isOpen = expandedDifficulty[diff] || search.trim().length > 0;

                  return (
                    <Collapsible
                      key={diff}
                      open={isOpen}
                      onOpenChange={open => setExpandedDifficulty(prev => ({ ...prev, [diff]: open }))}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        <DiffIcon className={cn("h-4 w-4", config.color)} />
                        <span className="text-sm font-semibold">{config.label}</span>
                        <Badge variant="outline" className="text-[10px] h-4 ml-auto">{items.length}</Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="grid grid-cols-1 gap-2">
                          {items.map(f => (
                            <Card key={f.key} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all group">
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold text-foreground uppercase">{f.key}</span>
                                      <Badge variant="outline" className={cn("text-[9px] h-4", config.badgeClass)}>
                                        {f.category}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">{f.description}</p>
                                    <code className="text-[11px] font-mono bg-muted/50 px-2 py-1 rounded block text-primary/80 break-all">
                                      {f.formula}
                                    </code>
                                    <div className="mt-2 text-[10px] text-muted-foreground/70">
                                      <span className="font-medium">Example:</span> <code className="text-[10px]">{f.example}</code>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(f.example)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleImport(f)}
                                      title="Import to Dashboard">
                                      <ArrowRight className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {items.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">No {config.label.toLowerCase()} formulas match your search.</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
