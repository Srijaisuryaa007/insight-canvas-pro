// Excel Knowledge Base — Comprehensive formulas, concepts, functions, and troubleshooting

export const EXCEL_FORMULAS: Record<string, { formula: string; description: string; example: string; category: string }> = {
  // ── Math & Statistical ──
  sum: { formula: 'SUM(range)', description: 'Adds all numbers in a range.', example: '=SUM(A1:A100)', category: 'math' },
  average: { formula: 'AVERAGE(range)', description: 'Calculates arithmetic mean.', example: '=AVERAGE(B2:B50)', category: 'math' },
  count: { formula: 'COUNT(range)', description: 'Counts cells with numbers.', example: '=COUNT(A:A)', category: 'math' },
  counta: { formula: 'COUNTA(range)', description: 'Counts non-empty cells.', example: '=COUNTA(A1:A100)', category: 'math' },
  countblank: { formula: 'COUNTBLANK(range)', description: 'Counts empty cells.', example: '=COUNTBLANK(B:B)', category: 'math' },
  max: { formula: 'MAX(range)', description: 'Returns largest value.', example: '=MAX(C2:C100)', category: 'math' },
  min: { formula: 'MIN(range)', description: 'Returns smallest value.', example: '=MIN(C2:C100)', category: 'math' },
  median: { formula: 'MEDIAN(range)', description: 'Returns middle value.', example: '=MEDIAN(D2:D100)', category: 'math' },
  mode: { formula: 'MODE.SNGL(range)', description: 'Returns most frequent value.', example: '=MODE.SNGL(E2:E100)', category: 'math' },
  stdev: { formula: 'STDEV.S(range)', description: 'Standard deviation (sample).', example: '=STDEV.S(A2:A100)', category: 'math' },
  var: { formula: 'VAR.S(range)', description: 'Variance (sample).', example: '=VAR.S(A2:A100)', category: 'math' },
  round: { formula: 'ROUND(number, decimals)', description: 'Rounds to specified decimals.', example: '=ROUND(A1, 2)', category: 'math' },
  roundup: { formula: 'ROUNDUP(number, decimals)', description: 'Always rounds up.', example: '=ROUNDUP(3.14159, 2) → 3.15', category: 'math' },
  rounddown: { formula: 'ROUNDDOWN(number, decimals)', description: 'Always rounds down.', example: '=ROUNDDOWN(3.99, 0) → 3', category: 'math' },
  ceiling: { formula: 'CEILING.MATH(number, [significance])', description: 'Rounds up to nearest multiple.', example: '=CEILING.MATH(23, 5) → 25', category: 'math' },
  floor: { formula: 'FLOOR.MATH(number, [significance])', description: 'Rounds down to nearest multiple.', example: '=FLOOR.MATH(23, 5) → 20', category: 'math' },
  abs: { formula: 'ABS(number)', description: 'Returns absolute value.', example: '=ABS(-5) → 5', category: 'math' },
  mod: { formula: 'MOD(number, divisor)', description: 'Returns remainder.', example: '=MOD(17, 5) → 2', category: 'math' },
  power: { formula: 'POWER(number, power)', description: 'Raises to power.', example: '=POWER(2, 8) → 256', category: 'math' },
  sqrt: { formula: 'SQRT(number)', description: 'Square root.', example: '=SQRT(144) → 12', category: 'math' },
  rand: { formula: 'RAND()', description: 'Random number 0-1.', example: '=RAND()', category: 'math' },
  randbetween: { formula: 'RANDBETWEEN(bottom, top)', description: 'Random integer in range.', example: '=RANDBETWEEN(1, 100)', category: 'math' },
  
  // ── Conditional ──
  sumif: { formula: 'SUMIF(range, criteria, [sum_range])', description: 'Sum if condition met.', example: '=SUMIF(A:A, "North", B:B)', category: 'conditional' },
  sumifs: { formula: 'SUMIFS(sum_range, range1, criteria1, ...)', description: 'Sum with multiple conditions.', example: '=SUMIFS(C:C, A:A, "North", B:B, ">1000")', category: 'conditional' },
  countif: { formula: 'COUNTIF(range, criteria)', description: 'Count if condition met.', example: '=COUNTIF(A:A, "Complete")', category: 'conditional' },
  countifs: { formula: 'COUNTIFS(range1, criteria1, ...)', description: 'Count with multiple conditions.', example: '=COUNTIFS(A:A, "North", B:B, ">100")', category: 'conditional' },
  averageif: { formula: 'AVERAGEIF(range, criteria, [avg_range])', description: 'Average if condition met.', example: '=AVERAGEIF(A:A, "Active", B:B)', category: 'conditional' },
  averageifs: { formula: 'AVERAGEIFS(avg_range, range1, criteria1, ...)', description: 'Average with multiple conditions.', example: '=AVERAGEIFS(C:C, A:A, "North", B:B, "Q1")', category: 'conditional' },
  maxifs: { formula: 'MAXIFS(max_range, range1, criteria1, ...)', description: 'Max with conditions.', example: '=MAXIFS(B:B, A:A, "West")', category: 'conditional' },
  minifs: { formula: 'MINIFS(min_range, range1, criteria1, ...)', description: 'Min with conditions.', example: '=MINIFS(B:B, A:A, "East")', category: 'conditional' },
  
  // ── Logical ──
  if: { formula: 'IF(condition, true_value, false_value)', description: 'Returns value based on condition.', example: '=IF(A1>100, "High", "Low")', category: 'logical' },
  ifs: { formula: 'IFS(condition1, value1, ...)', description: 'Multiple conditions.', example: '=IFS(A1>=90, "A", A1>=80, "B", TRUE, "C")', category: 'logical' },
  iferror: { formula: 'IFERROR(value, error_value)', description: 'Catches errors.', example: '=IFERROR(A1/B1, 0)', category: 'logical' },
  ifna: { formula: 'IFNA(value, na_value)', description: 'Catches #N/A errors.', example: '=IFNA(VLOOKUP(...), "Not Found")', category: 'logical' },
  and: { formula: 'AND(condition1, condition2, ...)', description: 'TRUE if all conditions true.', example: '=AND(A1>0, B1>0)', category: 'logical' },
  or: { formula: 'OR(condition1, condition2, ...)', description: 'TRUE if any condition true.', example: '=OR(A1="Yes", B1="Yes")', category: 'logical' },
  not: { formula: 'NOT(condition)', description: 'Reverses logical value.', example: '=NOT(A1="Active")', category: 'logical' },
  xor: { formula: 'XOR(condition1, condition2, ...)', description: 'TRUE if odd number of conditions true.', example: '=XOR(A1, B1)', category: 'logical' },
  switch: { formula: 'SWITCH(expression, value1, result1, ..., [default])', description: 'Matches expression to values.', example: '=SWITCH(A1, 1, "Jan", 2, "Feb", "Unknown")', category: 'logical' },
  choose: { formula: 'CHOOSE(index, value1, value2, ...)', description: 'Returns value at index.', example: '=CHOOSE(2, "A", "B", "C") → "B"', category: 'logical' },
  
  // ── Lookup ──
  vlookup: { formula: 'VLOOKUP(lookup_value, table, col_index, [range_lookup])', description: 'Vertical lookup.', example: '=VLOOKUP(A1, Data!A:D, 3, FALSE)', category: 'lookup' },
  hlookup: { formula: 'HLOOKUP(lookup_value, table, row_index, [range_lookup])', description: 'Horizontal lookup.', example: '=HLOOKUP("Q1", A1:E5, 3, FALSE)', category: 'lookup' },
  xlookup: { formula: 'XLOOKUP(lookup, lookup_array, return_array, [not_found], [match_mode])', description: 'Modern lookup (Excel 365).', example: '=XLOOKUP(A1, IDs, Names, "Not Found")', category: 'lookup' },
  index: { formula: 'INDEX(array, row_num, [col_num])', description: 'Returns value at position.', example: '=INDEX(A1:C10, 5, 2)', category: 'lookup' },
  match: { formula: 'MATCH(lookup_value, lookup_array, [match_type])', description: 'Returns position of value.', example: '=MATCH("Apple", A:A, 0)', category: 'lookup' },
  indexmatch: { formula: 'INDEX(return_range, MATCH(lookup, lookup_range, 0))', description: 'Flexible lookup combo.', example: '=INDEX(B:B, MATCH(A1, A:A, 0))', category: 'lookup' },
  offset: { formula: 'OFFSET(reference, rows, cols, [height], [width])', description: 'Returns offset range.', example: '=SUM(OFFSET(A1, 1, 0, 5, 1))', category: 'lookup' },
  indirect: { formula: 'INDIRECT(ref_text)', description: 'Returns reference from text.', example: '=INDIRECT("Sheet2!A" & B1)', category: 'lookup' },
  
  // ── Text ──
  concatenate: { formula: 'CONCATENATE(text1, text2, ...)', description: 'Joins text strings.', example: '=CONCATENATE(A1, " ", B1)', category: 'text' },
  concat: { formula: 'CONCAT(text1, text2, ...)', description: 'Joins text (Excel 2016+).', example: '=CONCAT(A1:A5)', category: 'text' },
  textjoin: { formula: 'TEXTJOIN(delimiter, ignore_empty, text1, ...)', description: 'Joins with delimiter.', example: '=TEXTJOIN(", ", TRUE, A1:A10)', category: 'text' },
  left: { formula: 'LEFT(text, [num_chars])', description: 'Leftmost characters.', example: '=LEFT(A1, 3)', category: 'text' },
  right: { formula: 'RIGHT(text, [num_chars])', description: 'Rightmost characters.', example: '=RIGHT(A1, 4)', category: 'text' },
  mid: { formula: 'MID(text, start_num, num_chars)', description: 'Middle characters.', example: '=MID(A1, 2, 5)', category: 'text' },
  len: { formula: 'LEN(text)', description: 'Length of text.', example: '=LEN(A1)', category: 'text' },
  trim: { formula: 'TRIM(text)', description: 'Removes extra spaces.', example: '=TRIM(A1)', category: 'text' },
  clean: { formula: 'CLEAN(text)', description: 'Removes non-printable characters.', example: '=CLEAN(A1)', category: 'text' },
  upper: { formula: 'UPPER(text)', description: 'Converts to uppercase.', example: '=UPPER(A1)', category: 'text' },
  lower: { formula: 'LOWER(text)', description: 'Converts to lowercase.', example: '=LOWER(A1)', category: 'text' },
  proper: { formula: 'PROPER(text)', description: 'Capitalizes each word.', example: '=PROPER("john smith") → "John Smith"', category: 'text' },
  substitute: { formula: 'SUBSTITUTE(text, old, new, [instance])', description: 'Replaces text.', example: '=SUBSTITUTE(A1, "-", "_")', category: 'text' },
  replace: { formula: 'REPLACE(old_text, start, num_chars, new_text)', description: 'Replaces by position.', example: '=REPLACE(A1, 1, 3, "NEW")', category: 'text' },
  find: { formula: 'FIND(find_text, within_text, [start_num])', description: 'Position of text (case-sensitive).', example: '=FIND("@", A1)', category: 'text' },
  search: { formula: 'SEARCH(find_text, within_text, [start_num])', description: 'Position of text (case-insensitive).', example: '=SEARCH("apple", A1)', category: 'text' },
  text: { formula: 'TEXT(value, format_text)', description: 'Formats number as text.', example: '=TEXT(A1, "$#,##0.00")', category: 'text' },
  value: { formula: 'VALUE(text)', description: 'Converts text to number.', example: '=VALUE("123.45")', category: 'text' },
  rept: { formula: 'REPT(text, times)', description: 'Repeats text.', example: '=REPT("*", 5) → "*****"', category: 'text' },
  
  // ── Date & Time ──
  today: { formula: 'TODAY()', description: 'Current date.', example: '=TODAY()', category: 'date' },
  now: { formula: 'NOW()', description: 'Current date and time.', example: '=NOW()', category: 'date' },
  date: { formula: 'DATE(year, month, day)', description: 'Creates date.', example: '=DATE(2024, 6, 15)', category: 'date' },
  year: { formula: 'YEAR(date)', description: 'Extracts year.', example: '=YEAR(A1)', category: 'date' },
  month: { formula: 'MONTH(date)', description: 'Extracts month.', example: '=MONTH(A1)', category: 'date' },
  day: { formula: 'DAY(date)', description: 'Extracts day.', example: '=DAY(A1)', category: 'date' },
  weekday: { formula: 'WEEKDAY(date, [return_type])', description: 'Day of week number.', example: '=WEEKDAY(A1, 2)', category: 'date' },
  weeknum: { formula: 'WEEKNUM(date, [return_type])', description: 'Week number.', example: '=WEEKNUM(A1)', category: 'date' },
  eomonth: { formula: 'EOMONTH(start_date, months)', description: 'End of month.', example: '=EOMONTH(A1, 0)', category: 'date' },
  edate: { formula: 'EDATE(start_date, months)', description: 'Date + months.', example: '=EDATE(A1, 3)', category: 'date' },
  datedif: { formula: 'DATEDIF(start, end, unit)', description: 'Difference between dates.', example: '=DATEDIF(A1, B1, "M") (months)', category: 'date' },
  networkdays: { formula: 'NETWORKDAYS(start, end, [holidays])', description: 'Working days between dates.', example: '=NETWORKDAYS(A1, B1)', category: 'date' },
  workday: { formula: 'WORKDAY(start, days, [holidays])', description: 'Date after workdays.', example: '=WORKDAY(A1, 10)', category: 'date' },
  hour: { formula: 'HOUR(time)', description: 'Extracts hour.', example: '=HOUR(A1)', category: 'date' },
  minute: { formula: 'MINUTE(time)', description: 'Extracts minute.', example: '=MINUTE(A1)', category: 'date' },
  second: { formula: 'SECOND(time)', description: 'Extracts second.', example: '=SECOND(A1)', category: 'date' },
  
  // ── Dynamic Arrays (365) ──
  filter: { formula: 'FILTER(array, include, [if_empty])', description: 'Filters array by condition.', example: '=FILTER(A2:C100, B2:B100>1000)', category: 'array' },
  sort: { formula: 'SORT(array, [sort_index], [sort_order])', description: 'Sorts array.', example: '=SORT(A2:C100, 2, -1)', category: 'array' },
  sortby: { formula: 'SORTBY(array, by_array, [sort_order])', description: 'Sorts by another column.', example: '=SORTBY(A:A, B:B, -1)', category: 'array' },
  unique: { formula: 'UNIQUE(array, [by_col], [exactly_once])', description: 'Returns unique values.', example: '=UNIQUE(A2:A100)', category: 'array' },
  sequence: { formula: 'SEQUENCE(rows, [cols], [start], [step])', description: 'Generates sequence.', example: '=SEQUENCE(10, 1, 1, 1)', category: 'array' },
  randarray: { formula: 'RANDARRAY([rows], [cols], [min], [max], [integer])', description: 'Random array.', example: '=RANDARRAY(5, 3, 1, 100, TRUE)', category: 'array' },
  transpose: { formula: 'TRANSPOSE(array)', description: 'Flips rows/columns.', example: '=TRANSPOSE(A1:C3)', category: 'array' },
  
  // ── Financial ──
  pmt: { formula: 'PMT(rate, nper, pv, [fv], [type])', description: 'Periodic payment.', example: '=PMT(0.05/12, 360, -200000)', category: 'financial' },
  fv: { formula: 'FV(rate, nper, pmt, [pv], [type])', description: 'Future value.', example: '=FV(0.08/12, 120, -500)', category: 'financial' },
  pv: { formula: 'PV(rate, nper, pmt, [fv], [type])', description: 'Present value.', example: '=PV(0.06/12, 60, -1000)', category: 'financial' },
  npv: { formula: 'NPV(rate, values)', description: 'Net present value.', example: '=NPV(0.1, B2:B10) + B1', category: 'financial' },
  irr: { formula: 'IRR(values, [guess])', description: 'Internal rate of return.', example: '=IRR(A1:A10)', category: 'financial' },
  
  // ── Information ──
  isblank: { formula: 'ISBLANK(value)', description: 'TRUE if blank.', example: '=ISBLANK(A1)', category: 'info' },
  iserror: { formula: 'ISERROR(value)', description: 'TRUE if any error.', example: '=ISERROR(A1/B1)', category: 'info' },
  isna: { formula: 'ISNA(value)', description: 'TRUE if #N/A.', example: '=ISNA(VLOOKUP(...))', category: 'info' },
  isnumber: { formula: 'ISNUMBER(value)', description: 'TRUE if number.', example: '=ISNUMBER(A1)', category: 'info' },
  istext: { formula: 'ISTEXT(value)', description: 'TRUE if text.', example: '=ISTEXT(A1)', category: 'info' },
  type: { formula: 'TYPE(value)', description: 'Returns type code.', example: '=TYPE(A1)', category: 'info' },
  cell: { formula: 'CELL("info_type", reference)', description: 'Cell information.', example: '=CELL("address", A1)', category: 'info' },
};

export const EXCEL_CONCEPTS: Record<string, string> = {
  'pivot table': `**Pivot Tables** summarize large datasets interactively.

**Create:**
1. Select data range
2. Insert → Pivot Table
3. Drag fields to areas:
   - **Rows** — categories to group by
   - **Columns** — secondary grouping
   - **Values** — numbers to aggregate
   - **Filters** — top-level filters

**Tips:**
- Use Slicers for visual filtering
- Group dates by Month/Quarter/Year
- Create Calculated Fields for custom metrics
- Right-click → Show Values As → % of Total`,

  'conditional formatting': `**Conditional Formatting** applies visual styles based on cell values.

**Types:**
- **Highlight Rules** — Greater than, Less than, Equal to
- **Top/Bottom Rules** — Top 10, Bottom 10%
- **Data Bars** — Inline bar charts
- **Color Scales** — Gradient by value
- **Icon Sets** — Arrows, traffic lights

**Pro Tips:**
- Use formula rules for complex conditions: \`=$A1>$B1\`
- Combine with AND/OR for multiple criteria
- Use \`Stop If True\` to prevent rule conflicts`,

  'data validation': `**Data Validation** restricts cell input.

**Types:**
- **List** — dropdown of choices
- **Whole Number / Decimal** — numeric ranges
- **Date / Time** — date ranges
- **Text Length** — character limits
- **Custom** — formula-based

**Example (dropdown):**
Data → Data Validation → List → enter items separated by commas

**Example (formula):**
Custom: \`=AND(A1>0, A1<1000)\` — only allows 1-999`,

  'array formula': `**Array Formulas** return multiple values or process arrays.

**Legacy (Ctrl+Shift+Enter):**
\`{=SUM(A1:A10*B1:B10)}\` — weighted sum

**Dynamic Arrays (365):**
\`=FILTER(A2:C100, B2:B100>1000)\` — auto-spills results

**Key Functions:**
- FILTER — filter rows by condition
- SORT / SORTBY — sort results
- UNIQUE — distinct values
- SEQUENCE — generate numbers
- TRANSPOSE — flip rows/columns`,

  'named range': `**Named Ranges** assign labels to cells/ranges.

**Create:**
1. Select range
2. Name Box (left of formula bar) → type name → Enter

**Benefits:**
- Self-documenting formulas: \`=SUM(Revenue)\` vs \`=SUM(D2:D500)\`
- Auto-updates with Tables
- Works across sheets

**Manage:** Formulas → Name Manager

**Tip:** Use Tables (Ctrl+T) for auto-named, auto-expanding ranges.`,

  'table': `**Excel Tables** (Ctrl+T) convert ranges to structured data.

**Benefits:**
- Auto-expand when adding rows
- Structured references: \`=SUM(Table1[Revenue])\`
- Built-in filtering and sorting
- Banded rows for readability
- Total Row with dropdown aggregations

**Structured References:**
- \`[@Column]\` — current row's column
- \`[#Headers]\` — header row
- \`[#Totals]\` — total row
- \`Table1[Column]\` — entire column`,

  'shortcuts': `**Essential Excel Shortcuts:**

| Action | Windows | Mac |
|--------|---------|-----|
| Copy / Paste | Ctrl+C / Ctrl+V | Cmd+C / Cmd+V |
| Undo / Redo | Ctrl+Z / Ctrl+Y | Cmd+Z / Cmd+Y |
| Find / Replace | Ctrl+F / Ctrl+H | Cmd+F / Cmd+H |
| Toggle Filters | Ctrl+Shift+L | Cmd+Shift+L |
| Create Table | Ctrl+T | Cmd+T |
| Auto SUM | Alt+= | Cmd+Shift+T |
| Insert Date | Ctrl+; | Ctrl+; |
| Insert Time | Ctrl+Shift+: | Cmd+; |
| Fill Down | Ctrl+D | Cmd+D |
| Absolute Reference | F4 | Cmd+T |
| Show Formulas | Ctrl+\` | Ctrl+\` |
| Format Cells | Ctrl+1 | Cmd+1 |
| Select Column | Ctrl+Space | Ctrl+Space |
| Select Row | Shift+Space | Shift+Space |`,

  'charts': `**Excel Charts Guide:**

| Chart | Best For |
|-------|----------|
| Column/Bar | Comparing categories |
| Line | Trends over time |
| Pie/Donut | Part-of-whole (≤6 items) |
| Scatter | Correlations |
| Area | Cumulative trends |
| Combo | Two metrics, different scales |
| Waterfall | Cumulative effect |
| Funnel | Stage progression |

**Tips:**
- Select data → Insert → Recommended Charts
- Alt+F1 for quick chart
- Right-click elements to format
- Use secondary axis for different scales`,

  'best practices': `**Excel Best Practices:**

1. **Use Tables** (Ctrl+T) — auto-expanding, structured refs
2. **One fact per cell** — don't merge or combine data
3. **Use Named Ranges** — self-documenting formulas
4. **Avoid hardcoded values** — put constants in labeled cells
5. **Use IFERROR** — handle edge cases gracefully
6. **Keep raw data separate** — analysis on different sheet
7. **Use Conditional Formatting sparingly** — slows workbooks
8. **Document formulas** — comments or formula map sheet
9. **Lock important cells** — Review → Protect Sheet
10. **Use Tables for data that grows** — formulas auto-update`,

  'power query': `**Power Query** (Get & Transform) cleans and transforms data.

**Access:** Data → Get Data / From Table

**Common Operations:**
- **Remove columns** — right-click column header
- **Filter rows** — dropdown arrow in header
- **Split columns** — by delimiter or character count
- **Merge queries** — like SQL JOIN
- **Append queries** — combine tables (UNION)
- **Pivot/Unpivot** — reshape data
- **Add custom column** — formula-based

**Tip:** All steps are recorded and repeatable. Just refresh to update!`,

  'macro': `**Macros & VBA** automate repetitive tasks.

**Record a Macro:**
View → Macros → Record Macro

**Simple VBA Example:**
\`\`\`vb
Sub FormatReport()
  Range("A1:D1").Font.Bold = True
  Columns("A:D").AutoFit
  Range("A2:D100").Borders.LineStyle = xlContinuous
End Sub
\`\`\`

**Tips:**
- Use Macro Recorder to learn VBA syntax
- Save as .xlsm to keep macros
- Alt+F11 opens VBA Editor
- Assign macros to buttons for easy access`,
};

export const EXCEL_TROUBLESHOOTING: Record<string, string> = {
  '#ref': `**#REF! Error** — Invalid cell reference

**Causes:**
- Deleted row/column that formula referenced
- Copied formula with relative reference incorrectly
- VLOOKUP col_index exceeds table width

**Fixes:**
1. Ctrl+Z to undo if just happened
2. Check formula references
3. Use structured Table references (auto-update)
4. Wrap in IFERROR: \`=IFERROR(formula, "Check ref")\``,

  '#value': `**#VALUE! Error** — Wrong data type

**Causes:**
- Text where number expected
- Space characters in "empty" cells
- Array formula mismatch

**Fixes:**
1. Check cell contents (might look empty but have space)
2. Use TRIM() to clean data
3. Use VALUE() to convert text to number
4. Use ISNUMBER() to validate inputs`,

  '#n/a': `**#N/A Error** — Lookup value not found

**Causes:**
- VLOOKUP/XLOOKUP can't find match
- Leading/trailing spaces in lookup value
- Different data types (text vs number)

**Fixes:**
1. TRIM() both lookup value and lookup range
2. Check data types match
3. Use IFERROR or IFNA: \`=IFNA(VLOOKUP(...), "Not Found")\`
4. Verify exact match (FALSE in VLOOKUP)`,

  '#div/0': `**#DIV/0! Error** — Division by zero

**Causes:**
- Dividing by zero
- Dividing by empty cell
- AVERAGE of empty range

**Fixes:**
1. Use IFERROR: \`=IFERROR(A1/B1, 0)\`
2. Use IF to check: \`=IF(B1=0, 0, A1/B1)\`
3. Check for blank cells in divisor`,

  '#name': `**#NAME? Error** — Unrecognized formula/name

**Causes:**
- Misspelled function name
- Missing quotes around text
- Deleted named range
- Regional settings (comma vs semicolon)

**Fixes:**
1. Check function spelling
2. Add quotes: \`=IF(A1="Yes", 1, 0)\`
3. Check Name Manager for missing names
4. Use Function Wizard (fx button) for correct syntax`,

  'formula not calculating': `**Formula Shows Text, Not Result**

**Causes:**
- Cell formatted as Text
- Leading apostrophe (')
- Calculation set to Manual

**Fixes:**
1. Clear format: Home → Clear → Clear Formats
2. Check for leading apostrophe in formula bar
3. Press Ctrl+\` to toggle formula view
4. Formulas → Calculation Options → Automatic
5. Force recalc: Ctrl+Alt+F9`,

  'slow workbook': `**Slow Workbook Performance**

**Common causes:**
- Volatile functions (NOW, TODAY, RAND, INDIRECT, OFFSET)
- Excess conditional formatting
- Very large ranges in formulas
- Array formulas over large ranges
- Too many external links

**Fixes:**
1. Replace INDIRECT with direct references
2. Use Tables to limit formula ranges
3. Remove unnecessary conditional formatting
4. Convert formulas to values when done
5. Use Power Query instead of complex formulas
6. Split into multiple workbooks`,

  'circular reference': `**Circular Reference Error**

**Cause:** Formula references itself directly or indirectly.

**Example:** Cell A1 contains \`=A1+1\`

**Fixes:**
1. Formulas → Error Checking → Circular References
2. Trace the chain of references
3. Break the loop by referencing different cells
4. If intentional, enable iteration: File → Options → Formulas → Enable iterative calculation`,
};

/** Checks if query contains the key as a whole word (not inside another word) */
function matchesWholeWord(query: string, key: string): boolean {
  const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return regex.test(query);
}

/** Finds the best matching formula key — prefers longer (more specific) matches */
function findBestFormulaMatch(query: string, formulas: Record<string, { formula: string; description: string; example: string; category: string }>): [string, typeof formulas[string]] | null {
  const matches: [string, typeof formulas[string]][] = [];
  for (const [key, info] of Object.entries(formulas)) {
    if (matchesWholeWord(query, key)) {
      matches.push([key, info]);
    }
  }
  if (matches.length === 0) return null;
  // Return longest match (most specific)
  matches.sort((a, b) => b[0].length - a[0].length);
  return matches[0];
}

export function searchExcelKnowledge(query: string): string | null {
  const lower = query.toLowerCase();
  
  // Search concepts first (more specific multi-word keys)
  for (const [key, content] of Object.entries(EXCEL_CONCEPTS)) {
    if (lower.includes(key)) {
      return content;
    }
  }
  
  // Search troubleshooting (only if user explicitly mentions issue-related words)
  if (/\b(error|problem|issue|not working|fix|broken|wrong|debug|troubleshoot|#ref|#value|#n\/a|#div|#name|slow|circular)\b/i.test(query)) {
    for (const [key, content] of Object.entries(EXCEL_TROUBLESHOOTING)) {
      if (lower.includes(key)) {
        return content;
      }
    }
  }

  // Search formulas with whole-word matching
  const formulaMatch = findBestFormulaMatch(query, EXCEL_FORMULAS);
  if (formulaMatch) {
    const [, info] = formulaMatch;
    return `**${info.formula}**\n\n${info.description}\n\n**Example:**\n\`${info.example}\`\n\n**Category:** ${info.category}`;
  }
  
  return null;
}

export function getExcelFormulasByCategory(category: string): typeof EXCEL_FORMULAS[string][] {
  return Object.values(EXCEL_FORMULAS).filter(f => f.category === category);
}

export function getAllExcelCategories(): string[] {
  return [...new Set(Object.values(EXCEL_FORMULAS).map(f => f.category))];
}
