import { TEMPLATES, type TemplateId } from '@/lib/reportTemplates';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  selected: TemplateId;
  onSelect: (id: TemplateId) => void;
}

const TEMPLATE_COLORS: Record<TemplateId, string> = {
  executive: '#1E40AF',
  analyst: '#7C3AED',
  storytelling: '#0891B2',
  operational: '#D97706',
  investor: '#DC2626',
  academic: '#059669',
};

/** Mini SVG layout thumbnails per template */
function TemplateThumbnail({ id, color }: { id: TemplateId; color: string }) {
  const bg = '#0F172A';
  const muted = '#1E293B';
  switch (id) {
    case 'executive':
      return (
        <svg viewBox="0 0 200 80" className="w-full h-[72px] rounded-t-lg">
          <rect width="200" height="80" fill={bg} />
          <rect x="12" y="10" width="52" height="24" rx="4" fill={color} opacity="0.3" />
          <rect x="74" y="10" width="52" height="24" rx="4" fill={color} opacity="0.3" />
          <rect x="136" y="10" width="52" height="24" rx="4" fill={color} opacity="0.3" />
          <rect x="16" y="16" width="24" height="4" rx="1" fill={color} opacity="0.8" />
          <rect x="78" y="16" width="24" height="4" rx="1" fill={color} opacity="0.8" />
          <rect x="140" y="16" width="24" height="4" rx="1" fill={color} opacity="0.8" />
          <rect x="16" y="24" width="16" height="3" rx="1" fill="#475569" />
          <rect x="78" y="24" width="16" height="3" rx="1" fill="#475569" />
          <rect x="140" y="24" width="16" height="3" rx="1" fill="#475569" />
          <rect x="12" y="42" width="176" height="28" rx="4" fill={muted} />
          <rect x="20" y="48" width="60" height="3" rx="1" fill="#475569" />
          <rect x="20" y="55" width="80" height="3" rx="1" fill="#334155" />
          <rect x="20" y="62" width="40" height="3" rx="1" fill="#334155" />
        </svg>
      );
    case 'analyst':
      return (
        <svg viewBox="0 0 200 80" className="w-full h-[72px] rounded-t-lg">
          <rect width="200" height="80" fill={bg} />
          <rect x="12" y="8" width="90" height="64" rx="4" fill={muted} />
          {/* Chart bars */}
          <rect x="22" y="44" width="10" height="20" rx="1" fill={color} opacity="0.7" />
          <rect x="36" y="34" width="10" height="30" rx="1" fill={color} opacity="0.8" />
          <rect x="50" y="24" width="10" height="40" rx="1" fill={color} opacity="0.9" />
          <rect x="64" y="38" width="10" height="26" rx="1" fill={color} opacity="0.6" />
          <rect x="78" y="28" width="10" height="36" rx="1" fill={color} opacity="0.85" />
          <rect x="22" y="14" width="40" height="3" rx="1" fill="#475569" />
          {/* Table */}
          <rect x="112" y="8" width="76" height="64" rx="4" fill={muted} />
          <rect x="118" y="14" width="64" height="3" rx="1" fill="#475569" />
          {[22, 30, 38, 46, 54].map(y => (
            <g key={y}>
              <rect x="118" y={y} width="28" height="3" rx="1" fill="#334155" />
              <rect x="152" y={y} width="28" height="3" rx="1" fill="#334155" />
            </g>
          ))}
        </svg>
      );
    case 'storytelling':
      return (
        <svg viewBox="0 0 200 80" className="w-full h-[72px] rounded-t-lg">
          <rect width="200" height="80" fill={bg} />
          <rect x="12" y="12" width="120" height="6" rx="2" fill={color} opacity="0.8" />
          <rect x="12" y="24" width="80" height="4" rx="1" fill="#475569" />
          <rect x="12" y="34" width="100" height="3" rx="1" fill="#334155" />
          <rect x="12" y="42" width="90" height="3" rx="1" fill="#334155" />
          <rect x="12" y="50" width="70" height="3" rx="1" fill="#334155" />
          <rect x="140" y="22" width="48" height="48" rx="6" fill={muted} />
          <circle cx="164" cy="46" r="14" fill={color} opacity={0.2} />
          <circle cx="164" cy="46" r="14" fill="none" stroke={color} strokeWidth="2" opacity={0.4} />
        </svg>
      );
    case 'operational':
      return (
        <svg viewBox="0 0 200 80" className="w-full h-[72px] rounded-t-lg">
          <rect width="200" height="80" fill={bg} />
          {/* RAG status dots */}
          <circle cx="24" cy="18" r="5" fill="#10B981" />
          <rect x="36" y="15" width="50" height="4" rx="1" fill="#475569" />
          <circle cx="24" cy="34" r="5" fill={color} />
          <rect x="36" y="31" width="50" height="4" rx="1" fill="#475569" />
          <circle cx="24" cy="50" r="5" fill="#DC2626" />
          <rect x="36" y="47" width="50" height="4" rx="1" fill="#475569" />
          {/* Progress bars */}
          <rect x="110" y="14" width="78" height="8" rx="3" fill={muted} />
          <rect x="110" y="14" width="58" height="8" rx="3" fill="#10B981" opacity="0.6" />
          <rect x="110" y="30" width="78" height="8" rx="3" fill={muted} />
          <rect x="110" y="30" width="42" height="8" rx="3" fill={color} opacity="0.6" />
          <rect x="110" y="46" width="78" height="8" rx="3" fill={muted} />
          <rect x="110" y="46" width="18" height="8" rx="3" fill="#DC2626" opacity="0.6" />
          <rect x="12" y="64" width="176" height="6" rx="2" fill={muted} />
        </svg>
      );
    case 'investor':
      return (
        <svg viewBox="0 0 200 80" className="w-full h-[72px] rounded-t-lg">
          <rect width="200" height="80" fill="#000" />
          <text x="20" y="32" fontSize="20" fontWeight="bold" fill={color} opacity="0.9">$4.2M</text>
          <rect x="20" y="40" width="50" height="3" rx="1" fill="#475569" />
          <text x="120" y="32" fontSize="20" fontWeight="bold" fill="#10B981" opacity="0.9">+127%</text>
          <rect x="120" y="40" width="50" height="3" rx="1" fill="#475569" />
          {/* Growth line */}
          <polyline points="20,70 50,65 80,55 110,50 140,40 170,30 188,25" fill="none" stroke={color} strokeWidth="2" opacity="0.5" />
        </svg>
      );
    case 'academic':
      return (
        <svg viewBox="0 0 200 80" className="w-full h-[72px] rounded-t-lg">
          <rect width="200" height="80" fill={bg} />
          <rect x="12" y="8" width="60" height="4" rx="1" fill={color} opacity="0.7" />
          <rect x="12" y="16" width="176" height="2" rx="1" fill="#334155" />
          {[24, 32, 40, 48, 56, 64].map(y => (
            <g key={y}>
              <rect x="12" y={y} width={140 + Math.random() * 36} height="3" rx="1" fill="#334155" />
            </g>
          ))}
          <rect x="150" y="40" width="38" height="28" rx="3" fill={muted} />
          <rect x="156" y="46" width="26" height="3" rx="1" fill="#475569" />
          <rect x="156" y="54" width="20" height="3" rx="1" fill="#475569" />
        </svg>
      );
    default:
      return null;
  }
}

export default function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Report Template</h3>
        <p className="text-xs text-muted-foreground">Each template changes layout, colors, content focus, and storytelling style</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {TEMPLATES.map(tpl => {
          const color = TEMPLATE_COLORS[tpl.id];
          const isSelected = selected === tpl.id;
          return (
            <Card
              key={tpl.id}
              onClick={() => onSelect(tpl.id)}
              className={cn(
                'cursor-pointer transition-all duration-200 overflow-hidden border-2 bg-card group',
                isSelected
                  ? 'shadow-lg scale-[1.01]'
                  : 'border-border hover:border-muted-foreground/40 hover:-translate-y-[3px] hover:shadow-md'
              )}
              style={{
                borderColor: isSelected ? color : undefined,
                backgroundColor: isSelected ? `${color}12` : undefined,
              }}
            >
              {/* Top color bar */}
              <div className="h-[3px] w-full" style={{ backgroundColor: color }} />

              {/* SVG Thumbnail */}
              <TemplateThumbnail id={tpl.id} color={color} />

              <div className="p-3 pt-2">
                {/* Icon + Name */}
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                    style={{ backgroundColor: `${color}25`, color }}
                  >
                    {tpl.icon}
                  </div>
                  <span className="text-xs font-semibold truncate">{tpl.name}</span>
                </div>

                {/* Description */}
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">{tpl.description}</p>

                {/* Tag pill + Slides */}
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {tpl.tag}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{tpl.slides}</span>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="mt-2 flex items-center gap-1" style={{ color }}>
                    <Check className="h-3 w-3" />
                    <span className="text-[10px] font-semibold">Selected</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
