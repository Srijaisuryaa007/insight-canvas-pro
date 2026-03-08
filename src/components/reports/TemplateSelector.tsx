import { TEMPLATES, type TemplateId } from '@/lib/reportTemplates';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  selected: TemplateId;
  onSelect: (id: TemplateId) => void;
}

export default function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Report Template</h3>
        <p className="text-xs text-muted-foreground">Each template changes layout, colors, content focus, and storytelling style</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {TEMPLATES.map(tpl => (
          <Card
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            className={cn(
              'cursor-pointer p-3 transition-all duration-200 hover:scale-[1.02] border-2 bg-card',
              selected === tpl.id ? 'border-primary shadow-md' : 'border-border hover:border-muted-foreground/40'
            )}
          >
            {/* Color preview bar */}
            <div className="flex gap-0.5 mb-2 rounded overflow-hidden h-5">
              {tpl.colors.map((color, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>
            {/* Icon + Name */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{tpl.icon}</span>
              <span className="text-xs font-semibold">{tpl.name}</span>
            </div>
            {/* Description */}
            <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">{tpl.description}</p>
            {/* Tag + Slides */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-primary font-medium">{tpl.tag}</span>
              <span className="text-[10px] text-muted-foreground">{tpl.slides}</span>
            </div>
            {/* Selected indicator */}
            {selected === tpl.id && (
              <div className="mt-2 flex items-center gap-1 text-primary">
                <Check className="h-3 w-3" />
                <span className="text-[10px] font-semibold">Selected</span>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
