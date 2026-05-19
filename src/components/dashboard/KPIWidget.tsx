import { LucideIcon, DollarSign, ShoppingCart, TrendingUp, CreditCard, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KPIWidgetProps {
  title: string;
  value: string;
  formula?: string;
  aggregation?: string;
  trend?: number;
  icon?: LucideIcon;
  color?: string;
}

function pickIcon(title: string): { Icon: LucideIcon; color: string } {
  const t = title.toLowerCase();
  if (/(revenue|sales|amount|profit|price)/.test(t)) return { Icon: DollarSign, color: 'text-emerald-400' };
  if (/(count|qty|quantity|orders|units)/.test(t)) return { Icon: ShoppingCart, color: 'text-blue-400' };
  if (/(rate|score|pct|percent|ratio|margin|index)/.test(t)) return { Icon: TrendingUp, color: 'text-purple-400' };
  if (/(cost|expense|spend)/.test(t)) return { Icon: CreditCard, color: 'text-rose-400' };
  return { Icon: BarChart2, color: 'text-slate-400' };
}

export function KPIWidget({ title, value, formula, trend, icon, color }: KPIWidgetProps) {
  const picked = pickIcon(title);
  const Icon = icon || picked.Icon;
  const iconColor = color || picked.color;
  const safeValue = !value || value === '0' || value === '0.00' ? '—' : value;
  const trendNum = typeof trend === 'number' ? trend : 0;

  const trendPill =
    trendNum > 0.1
      ? { bg: 'bg-emerald-950/60', text: 'text-emerald-400', icon: '↑' }
      : trendNum < -0.1
      ? { bg: 'bg-rose-950/60', text: 'text-rose-400', icon: '↓' }
      : { bg: 'bg-slate-800/60', text: 'text-slate-400', icon: '→' };

  return (
    <div className="relative h-full w-full flex flex-col justify-between p-4 rounded-xl bg-card border border-border/60 hover:border-border transition-all duration-150 hover:scale-[1.01]">
      <span className="absolute top-2 right-2 text-[9px] font-bold tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-md">
        fx
      </span>

      <div className="flex items-start gap-2">
        <Icon className={cn('h-5 w-5 flex-shrink-0', iconColor)} />
        <span className="text-[11px] font-medium text-muted-foreground leading-tight line-clamp-2">{title}</span>
      </div>

      <div className="flex flex-col gap-1 mt-2">
        <span className="text-2xl xl:text-[28px] font-bold text-foreground leading-none">{safeValue}</span>
        {formula && (
          <span className="text-[10px] font-mono text-muted-foreground/70 truncate">fx {formula}</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md', trendPill.bg, trendPill.text)}>
          {trendPill.icon} {Math.abs(trendNum).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
