// DAX Knowledge Base — Comprehensive formulas, concepts, functions, and troubleshooting

export const DAX_FORMULAS: Record<string, { formula: string; description: string; example: string; category: string }> = {
  // ── Aggregation Functions ──
  sum: { formula: 'SUM(<column>)', description: 'Adds all numbers in a column.', example: 'Total Sales = SUM(Sales[Amount])', category: 'aggregation' },
  average: { formula: 'AVERAGE(<column>)', description: 'Returns arithmetic mean of numbers.', example: 'Avg Price = AVERAGE(Products[Price])', category: 'aggregation' },
  count: { formula: 'COUNT(<column>)', description: 'Counts numeric values.', example: 'Order Count = COUNT(Orders[OrderID])', category: 'aggregation' },
  counta: { formula: 'COUNTA(<column>)', description: 'Counts non-blank values.', example: 'Non-Empty = COUNTA(Data[Field])', category: 'aggregation' },
  countblank: { formula: 'COUNTBLANK(<column>)', description: 'Counts blank cells.', example: 'Missing = COUNTBLANK(Data[Email])', category: 'aggregation' },
  countrows: { formula: 'COUNTROWS(<table>)', description: 'Counts rows in a table.', example: 'Total Rows = COUNTROWS(Sales)', category: 'aggregation' },
  distinctcount: { formula: 'DISTINCTCOUNT(<column>)', description: 'Counts unique values.', example: 'Unique Customers = DISTINCTCOUNT(Orders[CustomerID])', category: 'aggregation' },
  max: { formula: 'MAX(<column>)', description: 'Returns largest value.', example: 'Max Sale = MAX(Sales[Amount])', category: 'aggregation' },
  min: { formula: 'MIN(<column>)', description: 'Returns smallest value.', example: 'Min Sale = MIN(Sales[Amount])', category: 'aggregation' },
  
  // ── Iterator Functions ──
  sumx: { formula: 'SUMX(<table>, <expression>)', description: 'Iterates rows, evaluates expression, sums results.', example: 'Total Revenue = SUMX(Sales, Sales[Qty] * Sales[Price])', category: 'iterator' },
  averagex: { formula: 'AVERAGEX(<table>, <expression>)', description: 'Iterates rows, evaluates expression, averages results.', example: 'Avg Line Total = AVERAGEX(OrderLines, [Qty] * [Price])', category: 'iterator' },
  countx: { formula: 'COUNTX(<table>, <expression>)', description: 'Counts rows where expression is not blank.', example: 'Active Count = COUNTX(FILTER(Employees, [Status] = "Active"), 1)', category: 'iterator' },
  maxx: { formula: 'MAXX(<table>, <expression>)', description: 'Returns max of expression evaluated per row.', example: 'Max Profit = MAXX(Products, [Revenue] - [Cost])', category: 'iterator' },
  minx: { formula: 'MINX(<table>, <expression>)', description: 'Returns min of expression evaluated per row.', example: 'Min Margin = MINX(Products, [Margin])', category: 'iterator' },
  rankx: { formula: 'RANKX(<table>, <expression>, [value], [order], [ties])', description: 'Ranks rows by expression.', example: 'Sales Rank = RANKX(ALL(Products), [Total Sales],, DESC, Dense)', category: 'iterator' },
  
  // ── Filter Functions ──
  calculate: { formula: 'CALCULATE(<expression>, <filter1>, ...)', description: 'Evaluates expression in modified filter context.', example: 'West Sales = CALCULATE(SUM(Sales[Amount]), Region[Name] = "West")', category: 'filter' },
  calculatetable: { formula: 'CALCULATETABLE(<table>, <filter1>, ...)', description: 'Returns table with modified filter context.', example: 'West Data = CALCULATETABLE(Sales, Region[Name] = "West")', category: 'filter' },
  filter: { formula: 'FILTER(<table>, <condition>)', description: 'Returns rows that satisfy condition.', example: 'Big Sales = FILTER(Sales, Sales[Amount] > 1000)', category: 'filter' },
  all: { formula: 'ALL(<table or column>)', description: 'Removes all filters from table/column.', example: '% of Total = DIVIDE([Sales], CALCULATE([Sales], ALL(Products)))', category: 'filter' },
  allexcept: { formula: 'ALLEXCEPT(<table>, <col1>, ...)', description: 'Removes filters except specified columns.', example: '% of Category = DIVIDE([Sales], CALCULATE([Sales], ALLEXCEPT(Products, Products[Category])))', category: 'filter' },
  allselected: { formula: 'ALLSELECTED(<table or column>)', description: 'Removes filters added by visual but keeps slicer filters.', example: '% of Visible = DIVIDE([Sales], CALCULATE([Sales], ALLSELECTED(Products)))', category: 'filter' },
  removefilters: { formula: 'REMOVEFILTERS(<table or column>)', description: 'Alias for ALL() — clears filters.', example: 'Unfiltered = CALCULATE([Sales], REMOVEFILTERS())', category: 'filter' },
  keepfilters: { formula: 'KEEPFILTERS(<expression>)', description: 'Adds filter instead of replacing.', example: 'Filtered = CALCULATE([Sales], KEEPFILTERS(Region[Name] = "West"))', category: 'filter' },
  selectedvalue: { formula: 'SELECTEDVALUE(<column>, [alternate])', description: 'Returns single selected value or alternate.', example: 'Selected Region = SELECTEDVALUE(Region[Name], "All")', category: 'filter' },
  hasonevalue: { formula: 'HASONEVALUE(<column>)', description: 'Returns TRUE if exactly one value in filter context.', example: 'Single Selection = HASONEVALUE(Products[Category])', category: 'filter' },
  isfiltered: { formula: 'ISFILTERED(<column>)', description: 'Returns TRUE if column is filtered.', example: 'Is Filtered = ISFILTERED(Products[Category])', category: 'filter' },
  
  // ── Time Intelligence ──
  totalytd: { formula: 'TOTALYTD(<expression>, <dates>, [filter])', description: 'Year-to-date total.', example: 'YTD Sales = TOTALYTD([Total Sales], Date[Date])', category: 'time' },
  totalmtd: { formula: 'TOTALMTD(<expression>, <dates>)', description: 'Month-to-date total.', example: 'MTD Sales = TOTALMTD([Total Sales], Date[Date])', category: 'time' },
  totalqtd: { formula: 'TOTALQTD(<expression>, <dates>)', description: 'Quarter-to-date total.', example: 'QTD Sales = TOTALQTD([Total Sales], Date[Date])', category: 'time' },
  sameperiodlastyear: { formula: 'SAMEPERIODLASTYEAR(<dates>)', description: 'Returns dates shifted back one year.', example: 'PY Sales = CALCULATE([Total Sales], SAMEPERIODLASTYEAR(Date[Date]))', category: 'time' },
  dateadd: { formula: 'DATEADD(<dates>, <intervals>, <interval>)', description: 'Shifts dates by interval.', example: 'Last Month = CALCULATE([Sales], DATEADD(Date[Date], -1, MONTH))', category: 'time' },
  parallelperiod: { formula: 'PARALLELPERIOD(<dates>, <intervals>, <interval>)', description: 'Returns parallel period.', example: 'Last Quarter = CALCULATE([Sales], PARALLELPERIOD(Date[Date], -1, QUARTER))', category: 'time' },
  datesytd: { formula: 'DATESYTD(<dates>, [yearend])', description: 'Returns YTD dates.', example: 'YTD Dates = DATESYTD(Date[Date])', category: 'time' },
  datesmtd: { formula: 'DATESMTD(<dates>)', description: 'Returns MTD dates.', example: 'MTD Dates = DATESMTD(Date[Date])', category: 'time' },
  previousmonth: { formula: 'PREVIOUSMONTH(<dates>)', description: 'Returns dates for previous month.', example: 'Prev Month = CALCULATE([Sales], PREVIOUSMONTH(Date[Date]))', category: 'time' },
  previousyear: { formula: 'PREVIOUSYEAR(<dates>)', description: 'Returns dates for previous year.', example: 'Prev Year = CALCULATE([Sales], PREVIOUSYEAR(Date[Date]))', category: 'time' },
  datesbetween: { formula: 'DATESBETWEEN(<dates>, <start>, <end>)', description: 'Returns dates in range.', example: 'Q1 Dates = DATESBETWEEN(Date[Date], DATE(2024,1,1), DATE(2024,3,31))', category: 'time' },
  
  // ── Logical Functions ──
  if: { formula: 'IF(<condition>, <true_result>, <false_result>)', description: 'Returns value based on condition.', example: 'Status = IF([Sales] > 1000, "High", "Low")', category: 'logical' },
  switch: { formula: 'SWITCH(<expression>, <value1>, <result1>, ..., [else])', description: 'Evaluates expression against list of values.', example: 'Rating = SWITCH(TRUE(), [Score] >= 90, "A", [Score] >= 80, "B", "C")', category: 'logical' },
  and: { formula: 'AND(<condition1>, <condition2>)', description: 'Returns TRUE if all conditions are true.', example: 'Both = AND([Sales] > 100, [Margin] > 0.2)', category: 'logical' },
  or: { formula: 'OR(<condition1>, <condition2>)', description: 'Returns TRUE if any condition is true.', example: 'Either = OR([Sales] > 1000, [Priority] = "High")', category: 'logical' },
  not: { formula: 'NOT(<condition>)', description: 'Reverses logical value.', example: 'Not Active = NOT([IsActive])', category: 'logical' },
  iferror: { formula: 'IFERROR(<value>, <alternate>)', description: 'Returns alternate if value errors.', example: 'Safe Div = IFERROR([A] / [B], 0)', category: 'logical' },
  coalesce: { formula: 'COALESCE(<expr1>, <expr2>, ...)', description: 'Returns first non-blank value.', example: 'First Valid = COALESCE([Nickname], [FullName], "Unknown")', category: 'logical' },
  isblank: { formula: 'ISBLANK(<value>)', description: 'Returns TRUE if value is blank.', example: 'Missing = ISBLANK([Email])', category: 'logical' },
  
  // ── Math Functions ──
  divide: { formula: 'DIVIDE(<numerator>, <denominator>, [alternate])', description: 'Safe division with fallback.', example: 'Margin = DIVIDE([Profit], [Revenue], 0)', category: 'math' },
  abs: { formula: 'ABS(<number>)', description: 'Returns absolute value.', example: 'Abs Diff = ABS([Actual] - [Budget])', category: 'math' },
  round: { formula: 'ROUND(<number>, <decimals>)', description: 'Rounds to specified decimals.', example: 'Rounded = ROUND([Value], 2)', category: 'math' },
  roundup: { formula: 'ROUNDUP(<number>, <decimals>)', description: 'Rounds up.', example: 'Ceiling = ROUNDUP([Value], 0)', category: 'math' },
  rounddown: { formula: 'ROUNDDOWN(<number>, <decimals>)', description: 'Rounds down.', example: 'Floor = ROUNDDOWN([Value], 0)', category: 'math' },
  trunc: { formula: 'TRUNC(<number>)', description: 'Truncates to integer.', example: 'Int Part = TRUNC([Value])', category: 'math' },
  mod: { formula: 'MOD(<number>, <divisor>)', description: 'Returns remainder.', example: 'Remainder = MOD([Value], 7)', category: 'math' },
  power: { formula: 'POWER(<number>, <power>)', description: 'Returns number raised to power.', example: 'Squared = POWER([Value], 2)', category: 'math' },
  sqrt: { formula: 'SQRT(<number>)', description: 'Returns square root.', example: 'Root = SQRT([Variance])', category: 'math' },
  log: { formula: 'LOG(<number>, [base])', description: 'Returns logarithm.', example: 'Log10 = LOG([Value], 10)', category: 'math' },
  ln: { formula: 'LN(<number>)', description: 'Returns natural log.', example: 'NatLog = LN([Value])', category: 'math' },
  exp: { formula: 'EXP(<number>)', description: 'Returns e raised to power.', example: 'Exp = EXP([Growth])', category: 'math' },
  
  // ── Text Functions ──
  concatenate: { formula: 'CONCATENATE(<text1>, <text2>, ...)', description: 'Joins text strings.', example: 'Full Name = CONCATENATE([First], " ", [Last])', category: 'text' },
  left: { formula: 'LEFT(<text>, <num_chars>)', description: 'Returns leftmost characters.', example: 'Code = LEFT([SKU], 3)', category: 'text' },
  right: { formula: 'RIGHT(<text>, <num_chars>)', description: 'Returns rightmost characters.', example: 'Suffix = RIGHT([Code], 2)', category: 'text' },
  mid: { formula: 'MID(<text>, <start>, <num_chars>)', description: 'Returns characters from middle.', example: 'Middle = MID([Code], 2, 3)', category: 'text' },
  len: { formula: 'LEN(<text>)', description: 'Returns length of text.', example: 'Length = LEN([Description])', category: 'text' },
  upper: { formula: 'UPPER(<text>)', description: 'Converts to uppercase.', example: 'Upper = UPPER([Name])', category: 'text' },
  lower: { formula: 'LOWER(<text>)', description: 'Converts to lowercase.', example: 'Lower = LOWER([Email])', category: 'text' },
  trim: { formula: 'TRIM(<text>)', description: 'Removes extra spaces.', example: 'Clean = TRIM([Input])', category: 'text' },
  substitute: { formula: 'SUBSTITUTE(<text>, <old>, <new>)', description: 'Replaces text.', example: 'Replaced = SUBSTITUTE([Text], "-", "_")', category: 'text' },
  format: { formula: 'FORMAT(<value>, <format_string>)', description: 'Formats value as text.', example: 'Formatted = FORMAT([Date], "MMMM YYYY")', category: 'text' },
  
  // ── Table Functions ──
  values: { formula: 'VALUES(<column or table>)', description: 'Returns distinct values with blank for invalid refs.', example: 'Unique = VALUES(Products[Category])', category: 'table' },
  distinct: { formula: 'DISTINCT(<column or table>)', description: 'Returns distinct values.', example: 'Distinct = DISTINCT(Products[Category])', category: 'table' },
  topn: { formula: 'TOPN(<n>, <table>, <orderby_expression>)', description: 'Returns top N rows.', example: 'Top 10 = TOPN(10, Products, [Total Sales], DESC)', category: 'table' },
  addcolumns: { formula: 'ADDCOLUMNS(<table>, <name>, <expression>, ...)', description: 'Adds calculated columns to table.', example: 'Extended = ADDCOLUMNS(Sales, "Profit", [Revenue] - [Cost])', category: 'table' },
  selectcolumns: { formula: 'SELECTCOLUMNS(<table>, <name>, <expression>, ...)', description: 'Returns table with only specified columns.', example: 'Subset = SELECTCOLUMNS(Sales, "Product", [ProductName], "Amount", [Total])', category: 'table' },
  summarize: { formula: 'SUMMARIZE(<table>, <groupby_col>, <name>, <expression>)', description: 'Groups and aggregates.', example: 'Summary = SUMMARIZE(Sales, Products[Category], "Total", SUM(Sales[Amount]))', category: 'table' },
  union: { formula: 'UNION(<table1>, <table2>, ...)', description: 'Combines tables vertically.', example: 'Combined = UNION(Sales2023, Sales2024)', category: 'table' },
  except: { formula: 'EXCEPT(<table1>, <table2>)', description: 'Returns rows in table1 not in table2.', example: 'New Customers = EXCEPT(CurrentCustomers, LastYearCustomers)', category: 'table' },
  intersect: { formula: 'INTERSECT(<table1>, <table2>)', description: 'Returns common rows.', example: 'Common = INTERSECT(ListA, ListB)', category: 'table' },
  crossjoin: { formula: 'CROSSJOIN(<table1>, <table2>)', description: 'Returns Cartesian product.', example: 'Matrix = CROSSJOIN(Regions, Products)', category: 'table' },
  naturalleftouterjoin: { formula: 'NATURALLEFTOUTERJOIN(<left>, <right>)', description: 'Left outer join on common columns.', example: 'Joined = NATURALLEFTOUTERJOIN(Orders, Products)', category: 'table' },
  
  // ── Relationship Functions ──
  related: { formula: 'RELATED(<column>)', description: 'Gets value from related table (many-to-one).', example: 'Category = RELATED(Products[CategoryName])', category: 'relationship' },
  relatedtable: { formula: 'RELATEDTABLE(<table>)', description: 'Gets related rows (one-to-many).', example: 'Order Count = COUNTROWS(RELATEDTABLE(Orders))', category: 'relationship' },
  userelationship: { formula: 'USERELATIONSHIP(<col1>, <col2>)', description: 'Activates inactive relationship.', example: 'Ship Date Sales = CALCULATE([Sales], USERELATIONSHIP(Orders[ShipDate], Date[Date]))', category: 'relationship' },
  treatas: { formula: 'TREATAS(<table>, <column>, ...)', description: 'Applies table as filter to columns.', example: 'Filtered = CALCULATE([Sales], TREATAS(TopProducts, Products[ID]))', category: 'relationship' },
  
  // ── Date Functions ──
  date: { formula: 'DATE(<year>, <month>, <day>)', description: 'Creates date from components.', example: 'Start = DATE(2024, 1, 1)', category: 'date' },
  today: { formula: 'TODAY()', description: 'Returns current date.', example: 'Current = TODAY()', category: 'date' },
  now: { formula: 'NOW()', description: 'Returns current date and time.', example: 'Timestamp = NOW()', category: 'date' },
  year: { formula: 'YEAR(<date>)', description: 'Extracts year.', example: 'Year = YEAR([OrderDate])', category: 'date' },
  month: { formula: 'MONTH(<date>)', description: 'Extracts month number.', example: 'Month = MONTH([OrderDate])', category: 'date' },
  day: { formula: 'DAY(<date>)', description: 'Extracts day.', example: 'Day = DAY([OrderDate])', category: 'date' },
  weekday: { formula: 'WEEKDAY(<date>, [type])', description: 'Returns day of week.', example: 'DayOfWeek = WEEKDAY([Date], 2)', category: 'date' },
  weeknum: { formula: 'WEEKNUM(<date>)', description: 'Returns week number.', example: 'Week = WEEKNUM([Date])', category: 'date' },
  eomonth: { formula: 'EOMONTH(<date>, <months>)', description: 'Returns end of month.', example: 'MonthEnd = EOMONTH([Date], 0)', category: 'date' },
  datediff: { formula: 'DATEDIFF(<start>, <end>, <interval>)', description: 'Returns difference between dates.', example: 'Days = DATEDIFF([Start], [End], DAY)', category: 'date' },
  calendar: { formula: 'CALENDAR(<start>, <end>)', description: 'Creates date table.', example: 'Dates = CALENDAR(DATE(2020,1,1), DATE(2025,12,31))', category: 'date' },
  calendarauto: { formula: 'CALENDARAUTO([fiscal_year_end_month])', description: 'Auto-generates date table.', example: 'Dates = CALENDARAUTO()', category: 'date' },
};

export const DAX_CONCEPTS: Record<string, string> = {
  'filter context': `**Filter Context** is the set of active filters that affect measure evaluation.

**Sources:**
- Slicers and filters
- Cross-filtering from visuals
- Row/column headers in matrices
- CALCULATE modifiers

**Example:**
When you slice by "Region = West", every measure automatically evaluates only for West region data.

**Key functions that modify filter context:**
- \`CALCULATE\` — adds/replaces filters
- \`ALL\` — removes filters
- \`KEEPFILTERS\` — adds without replacing`,

  'row context': `**Row Context** exists when DAX iterates row by row.

**Created by:**
- Calculated columns (each row evaluated separately)
- Iterator functions (SUMX, FILTER, ADDCOLUMNS)

**Example:**
\`\`\`dax
Profit = Sales[Revenue] - Sales[Cost]  // Row context in calculated column
\`\`\`

**No row context in measures** — measures only have filter context unless you use iterators.`,

  'context transition': `**Context Transition** converts row context to filter context inside CALCULATE.

**When it happens:**
Inside an iterator, when you call CALCULATE, the current row values become filters.

**Example:**
\`\`\`dax
Running Total = 
SUMX(
  Sales,
  CALCULATE(SUM(Sales[Amount]))  // Context transition here
)
\`\`\`

**Why it matters:** Enables measures to work correctly inside calculated columns and iterators.`,

  'variables': `**Variables (VAR/RETURN)** store intermediate results for reuse.

\`\`\`dax
Profit Margin = 
VAR TotalRevenue = SUM(Sales[Revenue])
VAR TotalCost = SUM(Sales[Cost])
VAR Profit = TotalRevenue - TotalCost
RETURN
  DIVIDE(Profit, TotalRevenue, 0)
\`\`\`

**Benefits:**
1. **Performance** — expression evaluated once
2. **Readability** — meaningful names
3. **Debugging** — test each variable
4. **Context preservation** — VAR captures context at definition time`,

  'calculated column vs measure': `**Calculated Column vs Measure:**

| Aspect | Calculated Column | Measure |
|--------|-------------------|---------|
| Evaluated | At data refresh | At query time |
| Context | Row context | Filter context |
| Storage | Stored in model | Not stored |
| Use for | Row labels, groups | Aggregations, KPIs |
| Memory | Increases model size | No impact |

**Rule:** If it aggregates → Measure. If it labels each row → Calculated Column.`,

  'relationships': `**Relationships in DAX:**

**One-to-Many (recommended):**
- Filter flows from "one" side to "many" side
- Products (one) → Sales (many)

**RELATED vs RELATEDTABLE:**
- \`RELATED()\` — get value from "one" side (in many-side context)
- \`RELATEDTABLE()\` — get rows from "many" side (in one-side context)

**Inactive Relationships:**
Use \`USERELATIONSHIP()\` to activate:
\`\`\`dax
Ship Date Sales = 
CALCULATE([Sales], USERELATIONSHIP(Orders[ShipDate], Date[Date]))
\`\`\``,

  'date table': `**Date Table Requirements:**

1. **Continuous dates** — no gaps
2. **Unique dates** — one row per day
3. **Full years** — include complete years
4. **Mark as Date Table** — Model → Mark as Date Table

**Create with CALENDAR:**
\`\`\`dax
Date = 
VAR MinDate = MIN(Sales[OrderDate])
VAR MaxDate = MAX(Sales[OrderDate])
RETURN
ADDCOLUMNS(
  CALENDAR(DATE(YEAR(MinDate), 1, 1), DATE(YEAR(MaxDate), 12, 31)),
  "Year", YEAR([Date]),
  "Month", MONTH([Date]),
  "MonthName", FORMAT([Date], "MMMM"),
  "Quarter", "Q" & FORMAT([Date], "Q")
)
\`\`\``,

  'best practices': `**DAX Best Practices:**

1. **Use variables** — VAR/RETURN for readability and performance
2. **Prefer measures over calculated columns** — for aggregations
3. **Use DIVIDE()** — instead of / for safe division
4. **Avoid FILTER() with simple conditions** — use Boolean in CALCULATE
5. **Keep Date table clean** — continuous, marked, no gaps
6. **Avoid bi-directional relationships** — cause ambiguity
7. **Use SUMMARIZE carefully** — SUMMARIZECOLUMNS is better for new tables
8. **Test with DAX Studio** — profile performance
9. **Format your code** — use line breaks and indentation
10. **Document complex measures** — add comments`,
};

export const DAX_TROUBLESHOOTING: Record<string, string> = {
  'circular dependency': `**Circular Dependency Error**

**Cause:** A calculated column references a measure that references the same table.

**Solutions:**
1. Convert calculated column to measure
2. Use CALCULATE with ALLEXCEPT
3. Move calculation to a different table

**Example Fix:**
\`\`\`dax
// Instead of calculated column:
// Sales[RunningTotal] = ...

// Use measure:
Running Total = CALCULATE(SUM(Sales[Amount]), ...)
\`\`\``,

  'blank results': `**Blank Results / Empty Values**

**Common causes:**
1. No data in filter context
2. Division by zero (use DIVIDE)
3. Missing relationships
4. Filter too restrictive

**Debugging:**
\`\`\`dax
Debug = 
VAR Val = [Your Measure]
RETURN IF(ISBLANK(Val), "BLANK: Check filters", Val)
\`\`\`

**Fixes:**
- Use \`COALESCE(expr, 0)\` for fallback
- Use \`DIVIDE(a, b, 0)\` for safe division
- Check relationship directions`,

  'wrong totals': `**Wrong Totals / Grand Total Issues**

**Cause:** Measure doesn't aggregate correctly at higher levels.

**Example Problem:**
Average of averages ≠ overall average

**Solution:** Use iterators:
\`\`\`dax
Correct Weighted Avg = 
DIVIDE(
  SUMX(Products, [Qty] * [Price]),
  SUM(Products[Qty])
)
\`\`\`

**For ratios:**
\`\`\`dax
Correct Ratio = 
DIVIDE(
  SUM(Sales[Revenue]),
  CALCULATE(SUM(Sales[Revenue]), ALL(Products))
)
\`\`\``,

  'slow performance': `**Slow Measure Performance**

**Common causes:**
1. Excessive FILTER() usage
2. Too many calculated columns
3. Complex iterators on large tables
4. Missing relationships (cross-join)

**Optimizations:**
1. Replace \`FILTER(table, condition)\` with Boolean in CALCULATE
2. Use variables to avoid recalculation
3. Avoid DISTINCTCOUNT on high-cardinality columns
4. Use SUMMARIZECOLUMNS instead of SUMMARIZE
5. Profile with DAX Studio

**Before:**
\`\`\`dax
CALCULATE(SUM(...), FILTER(ALL(Table), Table[Col] = "X"))
\`\`\`

**After:**
\`\`\`dax
CALCULATE(SUM(...), Table[Col] = "X")
\`\`\``,

  'context issues': `**Unexpected Filter Context**

**Symptoms:**
- Measure shows same value everywhere
- Values don't change with slicers

**Debugging:**
\`\`\`dax
Context Check = 
"Filtered: " & IF(ISFILTERED(Table[Column]), "Yes", "No") &
" | Values: " & COUNTROWS(VALUES(Table[Column]))
\`\`\`

**Common fixes:**
1. Remove unwanted ALL()
2. Check relationship direction
3. Use ALLSELECTED instead of ALL for visual totals
4. Ensure column is in model relationship`,

  'time intelligence not working': `**Time Intelligence Not Working**

**Checklist:**
1. ✅ Date table exists (continuous dates)
2. ✅ Marked as Date Table in model
3. ✅ Relationship to Date table exists
4. ✅ Using Date column (not DateTime)
5. ✅ Full years in Date table

**Common mistakes:**
\`\`\`dax
// WRONG — using fact table dates
TOTALYTD([Sales], Sales[OrderDate])

// CORRECT — using Date table
TOTALYTD([Sales], Date[Date])
\`\`\`

**Create proper Date table:**
\`\`\`dax
Date = CALENDARAUTO()
\`\`\``,
};

export function searchDAXKnowledge(query: string): string | null {
  const lower = query.toLowerCase();
  
  // Search formulas
  for (const [key, info] of Object.entries(DAX_FORMULAS)) {
    if (lower.includes(key)) {
      return `**${info.formula}**\n\n${info.description}\n\n**Example:**\n\`\`\`dax\n${info.example}\n\`\`\`\n\n**Category:** ${info.category}`;
    }
  }
  
  // Search concepts
  for (const [key, content] of Object.entries(DAX_CONCEPTS)) {
    if (lower.includes(key)) {
      return content;
    }
  }
  
  // Search troubleshooting
  for (const [key, content] of Object.entries(DAX_TROUBLESHOOTING)) {
    if (lower.includes(key) || lower.includes('error') || lower.includes('problem') || lower.includes('issue') || lower.includes('not working')) {
      return content;
    }
  }
  
  return null;
}

export function getDAXFormulasByCategory(category: string): typeof DAX_FORMULAS[string][] {
  return Object.values(DAX_FORMULAS).filter(f => f.category === category);
}

export function getAllDAXCategories(): string[] {
  return [...new Set(Object.values(DAX_FORMULAS).map(f => f.category))];
}
