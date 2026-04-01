import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutDashboard, FolderOpen, Sparkles, X, Eye, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  DASHBOARD_TEMPLATES,
  CATEGORY_COLORS,
  ALL_CATEGORIES,
  NEW_TEMPLATE_IDS,
  FEATURED_TEMPLATE_IDS,
} from '@/lib/dashboardTemplates';
import type { DashboardTemplate } from '@/types/dashboard';

const RECENT_KEY = 'datavora_recent_templates';

function getRecentTemplates(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 3);
  } catch { return []; }
}

function saveRecentTemplate(id: string) {
  const recent = getRecentTemplates().filter(r => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 3)));
}

interface TemplateGalleryProps {
  plan: string;
  widgetLimit: number;
  onSelectTemplate: (template: DashboardTemplate) => void;
  onShowSaved: () => void;
}

export default function TemplateGallery({ plan, widgetLimit, onSelectTemplate, onShowSaved }: TemplateGalleryProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [previewTemplate, setPreviewTemplate] = useState<DashboardTemplate | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>(getRecentTemplates);

  const filtered = useMemo(() => {
    return DASHBOARD_TEMPLATES.filter(t => {
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === 'All' || t.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [search, activeCategory]);

  const featured = useMemo(() =>
    FEATURED_TEMPLATE_IDS.map(id => DASHBOARD_TEMPLATES.find(t => t.id === id)).filter(Boolean) as DashboardTemplate[],
  []);

  const recentTemplates = useMemo(() =>
    recentIds.map(id => DASHBOARD_TEMPLATES.find(t => t.id === id)).filter(Boolean) as DashboardTemplate[],
  [recentIds]);

  const handleSelect = (template: DashboardTemplate) => {
    saveRecentTemplate(template.id);
    setRecentIds(getRecentTemplates());
    onSelectTemplate(template);
  };

  const getCategoryColor = (cat: string) => CATEGORY_COLORS[cat] || '#64748B';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-7 w-7" />Dashboard Builder
          </h1>
          <p className="text-muted-foreground">
            {filtered.length === DASHBOARD_TEMPLATES.length
              ? `${DASHBOARD_TEMPLATES.length} templates`
              : `Showing ${filtered.length} of ${DASHBOARD_TEMPLATES.length}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="capitalize">
            {plan} Plan • {widgetLimit === Infinity ? '∞' : widgetLimit} widgets/page
          </Badge>
          <Button variant="outline" onClick={onShowSaved}>
            <FolderOpen className="h-4 w-4 mr-2" />Saved
          </Button>
        </div>
      </div>

      {/* Search + Category Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-10"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border hover:border-muted-foreground/40'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Recently Used */}
      {recentTemplates.length > 0 && activeCategory === 'All' && !search && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Continue where you left off</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentTemplates.map(t => (
              <Card
                key={t.id}
                onClick={() => handleSelect(t)}
                className="min-w-[200px] max-w-[220px] bg-card border-border hover:shadow-md transition-all cursor-pointer flex-shrink-0"
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-2xl">{t.thumbnail}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.category}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Featured / Popular */}
      {activeCategory === 'All' && !search && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />Popular Templates
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {featured.map(t => (
              <Card
                key={t.id}
                onClick={() => handleSelect(t)}
                className="min-w-[240px] max-w-[260px] bg-card border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-250 cursor-pointer flex-shrink-0 group"
              >
                <div className="h-1.5 rounded-t-lg" style={{ background: `linear-gradient(90deg, ${getCategoryColor(t.category)}, ${getCategoryColor(t.category)}88)` }} />
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{t.thumbnail}</span>
                    <span className="text-sm font-semibold group-hover:text-primary transition-colors">{t.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{t.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">🔍</span>
          <h3 className="text-lg font-medium">No templates found for &ldquo;{search}&rdquo;</h3>
          <p className="text-sm text-muted-foreground mt-1">Try: Sales, Finance, or Marketing</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setActiveCategory('All'); }}>
            Or start with Blank Canvas →
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Card
                  className="bg-card border-border overflow-hidden group cursor-pointer hover:shadow-[0_12px_32px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-250 relative"
                >
                  {/* Category color bar */}
                  <div
                    className="h-1.5"
                    style={{ background: `linear-gradient(90deg, ${getCategoryColor(t.category)}, ${getCategoryColor(t.category)}66)` }}
                  />

                  {/* NEW badge */}
                  {NEW_TEMPLATE_IDS.includes(t.id) && (
                    <span className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      NEW
                    </span>
                  )}

                  {/* Mini widget mockup */}
                  <div className="px-4 pt-3 pb-1">
                    <div className="bg-muted/30 rounded-md p-2 h-16 flex gap-1 items-end">
                      {t.pages[0]?.widgets.slice(0, 6).map((_, wi) => (
                        <div
                          key={wi}
                          className="rounded-sm flex-1 transition-all group-hover:opacity-80"
                          style={{
                            backgroundColor: getCategoryColor(t.category) + '40',
                            height: `${25 + Math.random() * 60}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <CardContent className="p-4 pt-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl">{t.thumbnail}</span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">{t.name}</h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] mt-0.5 border-transparent"
                          style={{ color: getCategoryColor(t.category), backgroundColor: getCategoryColor(t.category) + '15' }}
                        >
                          {t.category}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.description}</p>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      {t.pages[0]?.widgets.length || 0} widgets • {t.pages.length} page{t.pages.length > 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={e => { e.stopPropagation(); setPreviewTemplate(t); }}
                      >
                        <Eye className="h-3 w-3 mr-1" />Preview
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={e => { e.stopPropagation(); handleSelect(t); }}
                      >
                        Use Template<ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          {previewTemplate && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{previewTemplate.thumbnail}</span>
                <div>
                  <h2 className="text-xl font-bold">{previewTemplate.name}</h2>
                  <Badge
                    variant="outline"
                    className="border-transparent"
                    style={{ color: getCategoryColor(previewTemplate.category), backgroundColor: getCategoryColor(previewTemplate.category) + '15' }}
                  >
                    {previewTemplate.category}
                  </Badge>
                </div>
                {NEW_TEMPLATE_IDS.includes(previewTemplate.id) && (
                  <Badge variant="destructive" className="text-xs ml-2">NEW</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">{previewTemplate.description}</p>
              <ScrollArea className="h-[400px] border border-border rounded-lg p-4 bg-muted/20">
                <div className="space-y-3">
                  {previewTemplate.pages.map((page, pi) => (
                    <div key={pi}>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Page: {page.name}</h4>
                      <div className="grid grid-cols-12 gap-2 auto-rows-[40px]">
                        {page.widgets.map((widget, wi) => (
                          <div
                            key={wi}
                            className="rounded-md border border-border/60 flex items-center justify-center text-[10px] text-muted-foreground bg-card"
                            style={{
                              gridColumn: `span ${widget.layout.w}`,
                              gridRow: `span ${widget.layout.h}`,
                              borderLeft: `3px solid ${getCategoryColor(previewTemplate.category)}`,
                            }}
                          >
                            <div className="text-center px-1">
                              <div className="font-medium">{widget.config.title || widget.type}</div>
                              <div className="text-[9px] opacity-60">{widget.type}{widget.config.chartType ? ` • ${widget.config.chartType}` : ''}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex justify-between items-center mt-4">
                <p className="text-xs text-muted-foreground">
                  {previewTemplate.pages[0]?.widgets.length || 0} widgets • {previewTemplate.pages.length} page{previewTemplate.pages.length > 1 ? 's' : ''}
                </p>
                <Button onClick={() => { handleSelect(previewTemplate); setPreviewTemplate(null); }}>
                  Use This Template<ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
