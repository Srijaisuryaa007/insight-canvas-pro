import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const TOUR_KEY = 'datavora_tour_done';

interface TourStep {
  selector: string;
  title: string;
  description: string;
  position: 'bottom' | 'right' | 'top';
}

const TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="sidebar"]', title: 'Navigation', description: 'Navigate between all your tools here', position: 'right' },
  { selector: '[data-tour="datasets"]', title: 'Upload Data', description: 'Start by uploading your data', position: 'right' },
  { selector: '[data-tour="builder"]', title: 'Templates', description: 'Or choose from 32 ready-made templates', position: 'right' },
  { selector: '[data-tour="copilot"]', title: 'AI Copilot', description: 'Ask AI anything about your data', position: 'right' },
  { selector: '[data-tour="reports"]', title: 'Reports', description: 'Generate professional reports in 1 click', position: 'right' },
];

export function ProductTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const onboardingDone = localStorage.getItem('datavora_onboarding_done');
    const tourDone = localStorage.getItem(TOUR_KEY);
    if (onboardingDone && !tourDone) {
      const timer = setTimeout(() => setActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const el = document.querySelector(TOUR_STEPS[step]?.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const tourStep = TOUR_STEPS[step];
      let top = rect.top + rect.height / 2 - 40;
      let left = rect.right + 16;
      if (tourStep.position === 'bottom') {
        top = rect.bottom + 12;
        left = rect.left;
      }
      setPos({ top, left });
      el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg', 'relative', 'z-[101]');
      return () => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg', 'relative', 'z-[101]');
    }
  }, [active, step]);

  const finish = () => {
    setActive(false);
    localStorage.setItem(TOUR_KEY, 'true');
  };

  const next = () => {
    if (step >= TOUR_STEPS.length - 1) {
      finish();
    } else {
      setStep(s => s + 1);
    }
  };

  if (!active) return null;

  return (
    <>
      <div className="fixed inset-0 bg-background/40 z-[100]" onClick={finish} />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="fixed z-[102] bg-popover border border-border rounded-xl shadow-xl p-4 w-64"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{step + 1} of {TOUR_STEPS.length}</span>
            <button onClick={finish} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
          <h4 className="text-sm font-semibold mb-1">{TOUR_STEPS[step].title}</h4>
          <p className="text-xs text-muted-foreground mb-3">{TOUR_STEPS[step].description}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={finish}>Skip</Button>
            <Button size="sm" className="text-xs flex-1" onClick={next}>
              {step >= TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
