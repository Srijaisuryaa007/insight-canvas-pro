
# Fix Plan: Data Quality, Insights, Chart Access, Customization, and Dashboard Export

## Problem Summary

There are 5 interconnected issues preventing the platform from working correctly:

1. **Quality Scan and Insights return 500 errors** because the backend cannot find the dataset (the frontend-generated ID does not match the backend store)
2. **Chart plan gating is broken** -- upgrading your plan in Settings updates `useSubscription` but the `VisualizationEngine` component reads from a completely different system (`useVisuals` / `AuthContext`) that never gets updated
3. **Only 6 chart types actually render** -- the ChartRenderer only handles bar, line, area, scatter, pie, radar; everything else shows "coming soon"
4. **No chart customization** -- no color, aggregation, or theme controls
5. **No dashboard export/view** -- no way to open dashboard in a new tab for sharing

---

## Fix 1: Quality Scan and Insights (Backend Data Sync)

**Root Cause**: When uploading, the frontend generates a local UUID. The backend may assign a different ID, or the upload may fail (500). When Quality/Insights POST with the local ID, the backend says "Dataset not found."

**Solution**: Send the actual dataset rows along with the quality/insights requests so the backend can analyze them directly, even without a stored dataset.

### Changes:

**`src/lib/api.ts`**
- Modify `runQualityScan` to accept and send `data` (the rows) alongside `datasetId`
- Modify `generateInsights` to accept and send `data` alongside `datasetId`
- Add local fallback: if the backend is unreachable (500), run a comprehensive client-side analysis engine

**`src/hooks/useDataQuality.ts`**
- Accept `data: Record<string, unknown>[]` parameter in `scanDataset`
- Pass data to the API call
- Add advanced local fallback analysis: missing values, duplicates, outliers (IQR + Z-score), skewness detection, format inconsistencies, invalid categories
- Implement real `applyFix` that mutates the dataset in `DataContext` (mean/median imputation, outlier capping, duplicate removal, type coercion)

**`src/hooks/useInsights.ts`**
- Accept `data` parameter in `generateInsights`
- Pass data to the API call
- Add local fallback analysis: trend detection, correlation matrix, distribution analysis, anomaly detection, key driver analysis

**`backend/index.js`**
- Update `/api/quality` to accept inline `data` if `datasetId` lookup fails
- Update `/api/insights` to accept inline `data` if `datasetId` lookup fails
- Add advanced detection: skewness, kurtosis, IQR outliers, category cardinality analysis

**`src/pages/dashboard/Quality.tsx`**
- Pass `currentData` from `useData()` to `scanDataset(datasetId, currentData)`
- Implement real "Preview Fix" showing before/after statistics
- Implement real "Auto Fix" that applies the fix to `currentData` and re-scans
- Add "Fix All" button to batch-fix all issues
- Add quality trend chart showing score history
- Add column-level detail panel with distribution histograms

**`src/pages/dashboard/Insights.tsx`**
- Pass `currentData` to `generateInsights(datasetId, currentData)`
- Add insight action buttons: "Visualize This", "Drill Down", "Share"
- Add confidence meter visualization per insight
- Add "Explain" button for each insight showing detailed statistical reasoning

---

## Fix 2: Chart Plan Gating (Unify Subscription System)

**Root Cause**: Two competing subscription systems exist:
- `useSubscription()` in `src/hooks/useSubscription.ts` reads from `CHART_TYPES_BY_PLAN` in `src/types/subscription.ts` (4 tiers, 30 charts) -- this is what Settings page updates
- `useVisuals()` in `src/hooks/useVisuals.ts` reads from `PLAN_LIMITS` in `src/types/index.ts` (3 tiers, 10 charts) -- this is what VisualizationEngine checks
- `useCredits()` in `src/hooks/useCredits.ts` reads from `AuthContext` -- yet another system

When you upgrade in Settings, only `useSubscription`'s localStorage is updated. `useVisuals` still reads the old AuthContext plan which remains "free."

**Solution**: Eliminate `useVisuals` and `useCredits`. Make `VisualizationEngine` use `useSubscription` exclusively.

### Changes:

**`src/components/charts/VisualizationEngine.tsx`**
- Replace `useVisuals` with `useSubscription`
- Replace `useCredits` with `useSubscription`
- Use `isChartAvailable()` from `useSubscription`

**`src/components/charts/LockedChart.tsx`**
- Replace `useVisuals` with `useSubscription`
- Use subscription plan data to show required plan

**`src/pages/dashboard/Overview.tsx`**
- Remove any `useVisuals`/`useCredits` usage, use `useSubscription` only

**`src/pages/dashboard/Reports.tsx`**
- Replace `useVisuals` with `useSubscription`

---

## Fix 3: Expand ChartRenderer to 30+ Chart Types

**Root Cause**: `ChartRenderer` only has switch cases for 6 types. All others fall through to "coming soon."

**Solution**: Add all chart type renderers using Recharts components and custom implementations.

### Changes:

**`src/components/charts/ChartRenderer.tsx`**
Add renderers for all 30 chart types:
- **Recharts-native** (direct support): `bar`, `line`, `area`, `scatter`, `pie`, `radar` (existing), plus `treemap`, `funnel`
- **Recharts-composed**: `histogram` (Bar with computed bins), `boxplot` (custom composite), `waterfall` (stacked bar with invisible base), `bubble` (scatter with Z-size), `heatmap` (grid of cells), `gauge` (custom radial), `stacked-bar`, `grouped-bar`, `stacked-area`, `donut` (pie with inner radius), `pareto` (bar + line combo)
- **Custom SVG**: `sankey`, `sunburst`, `polar`, `stream`, `calendar`, `word-cloud`, `timeline`, `candlestick`, `bullet`, `progress`, `kpi-card`
- **Placeholder with message**: `geo`, `choropleth`, `network`, `force`, `tree`, `parallel`, `3d-scatter`, `3d-surface` (marked as "requires additional setup")

Each chart will use the same data/xAxis/yAxis interface and will render real data.

---

## Fix 4: Chart Customization Panel

**Solution**: Add a customization side panel to the Visualizations page.

### Changes:

**`src/pages/dashboard/Visualizations.tsx`**
Add a customization card below the Configure Chart card with:
- **Color Theme**: Dropdown to select from 6 color palettes (Default, Pastel, Bold, Monochrome, Ocean, Sunset)
- **Aggregation**: Select sum, average, count, min, max for the Y-axis
- **Chart Options**: Toggle legend, grid lines, data labels, animations
- **Axis Labels**: Custom X/Y axis label inputs
- Pass all customization state to `VisualizationEngine`

**`src/components/charts/ChartRenderer.tsx`**
- Accept new props: `colorPalette`, `showLegend`, `showGrid`, `showLabels`, `aggregation`
- Apply these to all chart renders

---

## Fix 5: Dashboard Export / View in New Tab

**Solution**: Add a "View Dashboard" button that opens a standalone dashboard in a new browser tab, and a "Download Dashboard" button for HTML export.

### Changes:

**`src/pages/dashboard/Reports.tsx`**
- Add "Open Dashboard" button that opens `/dashboard/view` in a new tab
- Add "Download HTML" button that generates a self-contained HTML file with inline charts

**`src/pages/dashboard/DashboardView.tsx`** (new file)
- Standalone read-only dashboard page at route `/dashboard/view`
- Renders KPI cards + top charts from current dataset
- Clean layout without sidebar/topbar for presentation
- Uses `currentData` from DataContext (shared via localStorage for cross-tab)

**`src/App.tsx`**
- Add route for `/dashboard/view`

---

## Technical Details

### Files Modified (existing):
1. `src/lib/api.ts` -- add data param to quality/insights calls
2. `src/hooks/useDataQuality.ts` -- local fallback + real fix logic
3. `src/hooks/useInsights.ts` -- local fallback + data param
4. `src/components/charts/VisualizationEngine.tsx` -- use useSubscription
5. `src/components/charts/LockedChart.tsx` -- use useSubscription
6. `src/components/charts/ChartRenderer.tsx` -- 30+ chart types + customization props
7. `src/pages/dashboard/Quality.tsx` -- real fix flow + data passing
8. `src/pages/dashboard/Insights.tsx` -- data passing + action buttons
9. `src/pages/dashboard/Visualizations.tsx` -- customization panel + more charts
10. `src/pages/dashboard/Reports.tsx` -- dashboard view/download buttons
11. `src/pages/dashboard/Overview.tsx` -- remove useVisuals
12. `src/App.tsx` -- add dashboard view route
13. `backend/index.js` -- accept inline data in quality/insights

### Files Created (new):
1. `src/pages/dashboard/DashboardView.tsx` -- standalone viewable dashboard

### Files Removed:
- `src/hooks/useVisuals.ts` and `src/hooks/useCredits.ts` are no longer imported (can be deleted or left unused)

### No changes to:
- UI layout or spacing
- Sidebar or TopBar
- DataContext upload/select flow
- Landing page
- Authentication system
- Folder structure
