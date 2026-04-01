import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Check, X, Sparkles, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PLANS, PlanType } from '@/types/subscription';

interface PricingProps {
  onGetStarted: () => void;
}

function PriceCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView || value === 0) { setCount(value); return; }
    const duration = 1200;
    const steps = 40;
    const inc = value / steps;
    let current = 0;
    const t = setInterval(() => {
      current += inc;
      if (current >= value) { setCount(value); clearInterval(t); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(t);
  }, [isInView, value]);

  return <span ref={ref}>₹{count.toLocaleString('en-IN')}</span>;
}

const planBorderColors: Record<PlanType, string> = {
  free: 'border-white/10',
  basic: 'border-blue-500/40',
  pro: 'border-violet-500/60',
  enterprise: 'border-amber-500/40',
};

const planIcons: Record<PlanType, typeof Zap> = {
  free: Zap,
  basic: Sparkles,
  pro: Crown,
  enterprise: Crown,
};

export function Pricing({ onGetStarted }: PricingProps) {
  const planOrder: PlanType[] = ['free', 'basic', 'pro', 'enterprise'];

  return (
    <section id="pricing" className="py-28 relative">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold mb-5 tracking-tight">
            Simple, <span className="gradient-text">Transparent</span> Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you need more power.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {planOrder.map((planId, i) => {
            const plan = PLANS[planId];
            const Icon = planIcons[planId];
            const isPopular = planId === 'pro';
            const priceNum = planId === 'free' ? 0 : planId === 'basic' ? 415 : planId === 'pro' ? 1245 : 2075;

            return (
              <motion.div
                key={planId}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={isPopular ? 'lg:-mt-4' : ''}
              >
                <div className={`relative h-full rounded-2xl border bg-card p-7 transition-all duration-300 ${planBorderColors[planId]} ${
                  isPopular ? 'animate-pulse-glow shadow-xl shadow-violet-500/20' : 'card-hover'
                }`}>
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="gradient-primary border-0 text-white font-semibold px-4 animate-gradient-shift">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${
                      isPopular ? 'gradient-primary' : 'bg-white/5'
                    }`}>
                      <Icon className={`h-6 w-6 ${isPopular ? 'text-white' : 'text-muted-foreground'}`} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    <div className="mt-3">
                      <span className="text-4xl font-extrabold text-foreground">
                        <PriceCounter value={priceNum} />
                      </span>
                      {plan.price > 0 && <span className="text-muted-foreground">/mo</span>}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-accent-green mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                    {plan.excludedFeatures?.map((feature, j) => (
                      <li key={`ex-${j}`} className="flex items-start gap-2.5 text-sm">
                        <X className="h-4 w-4 text-accent-red mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={onGetStarted}
                    className={`w-full rounded-xl font-semibold py-5 ${
                      isPopular 
                        ? 'gradient-primary border-0 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40' 
                        : 'bg-white/5 border border-white/10 text-foreground hover:bg-white/10'
                    } transition-all`}
                  >
                    {plan.price === 0 ? 'Start Free' : 'Get Started'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
