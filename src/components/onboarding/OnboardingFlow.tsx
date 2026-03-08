import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Upload, Database, LayoutDashboard, Sparkles } from 'lucide-react';

const ONBOARDING_KEY = 'datavora_onboarding_done';

const USE_CASES = [
  { id: 'analytics', icon: '📊', label: 'Business Analytics' },
  { id: 'sales', icon: '💰', label: 'Sales Tracking' },
  { id: 'marketing', icon: '📈', label: 'Marketing Reports' },
  { id: 'finance', icon: '🏦', label: 'Finance Overview' },
  { id: 'operations', icon: '⚙️', label: 'Operations' },
  { id: 'product', icon: '🚀', label: 'Product Metrics' },
  { id: 'customer', icon: '👥', label: 'Customer Insights' },
  { id: 'ai', icon: '🤖', label: 'AI/Data Science' },
];

const TEAM_SIZES = [
  { id: 'solo', label: 'Just me', icon: '👤' },
  { id: 'small', label: '2-10', icon: '👥' },
  { id: 'medium', label: '11-50', icon: '🏢' },
  { id: 'large', label: '51-200', icon: '🏗️' },
  { id: 'enterprise', label: '200+', icon: '🌐' },
];

const DATA_SOURCES = [
  { id: 'csv', icon: '📁', label: 'Upload CSV/Excel', desc: 'Import files from your computer' },
  { id: 'sheets', icon: '🔗', label: 'Google Sheets', desc: 'Connect your spreadsheets' },
  { id: 'database', icon: '🗄️', label: 'Connect Database', desc: 'PostgreSQL, MySQL, etc.' },
  { id: 'sample', icon: '📊', label: 'Sample Data', desc: 'Start instantly with demo data' },
];

export function OnboardingFlow() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [useCases, setUseCases] = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setShow(true);
  }, []);

  const complete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    localStorage.setItem('datavora_onboarding_prefs', JSON.stringify({ useCases, teamSize, dataSource }));
    setShow(false);
  };

  const nextStep = () => {
    if (step === 3) {
      setShowConfetti(true);
    }
    setStep(s => s + 1);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-[600px] p-8 relative"
        >
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <span className="text-6xl block">👋</span>
              <h2 className="text-2xl font-bold">Welcome to DataVora</h2>
              <p className="text-muted-foreground">Let's set up your workspace in 2 minutes</p>
              <Button size="lg" onClick={nextStep} className="mt-4">
                Let's Go <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 1: Use Cases */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold">What will you use DataVora for?</h2>
                <p className="text-sm text-muted-foreground mt-1">Select all that apply</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {USE_CASES.map(uc => (
                  <button
                    key={uc.id}
                    onClick={() => setUseCases(prev =>
                      prev.includes(uc.id) ? prev.filter(x => x !== uc.id) : [...prev, uc.id]
                    )}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                      useCases.includes(uc.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    <span className="text-xl">{uc.icon}</span>
                    <span className="text-sm font-medium">{uc.label}</span>
                    {useCases.includes(uc.id) && <Check className="h-4 w-4 ml-auto text-primary" />}
                  </button>
                ))}
              </div>
              <Button onClick={nextStep} disabled={useCases.length === 0} className="w-full">
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Team Size */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold">How big is your team?</h2>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {TEAM_SIZES.map(ts => (
                  <button
                    key={ts.id}
                    onClick={() => setTeamSize(ts.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-w-[90px]',
                      teamSize === ts.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    <span className="text-2xl">{ts.icon}</span>
                    <span className="text-sm font-medium">{ts.label}</span>
                  </button>
                ))}
              </div>
              <Button onClick={nextStep} disabled={!teamSize} className="w-full">
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 3: Data Source */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold">Where is your data?</h2>
              </div>
              <div className="space-y-2">
                {DATA_SOURCES.map(ds => (
                  <button
                    key={ds.id}
                    onClick={() => setDataSource(ds.id)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                      dataSource === ds.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    <span className="text-2xl">{ds.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{ds.label}</p>
                      <p className="text-xs text-muted-foreground">{ds.desc}</p>
                    </div>
                    {dataSource === ds.id && <Check className="h-4 w-4 ml-auto text-primary" />}
                  </button>
                ))}
              </div>
              <Button onClick={nextStep} className="w-full">
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <button onClick={nextStep} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                Skip for now
              </button>
            </div>
          )}

          {/* Step 4: All Set */}
          {step === 4 && (
            <div className="text-center space-y-5">
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: -20, x: Math.random() * 600 - 100, opacity: 1 }}
                      animate={{ y: 600, opacity: 0, rotate: Math.random() * 720 }}
                      transition={{ duration: 2 + Math.random(), delay: Math.random() * 0.5 }}
                      className="absolute w-2 h-2 rounded-full"
                      style={{ backgroundColor: ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED'][i % 5] }}
                    />
                  ))}
                </div>
              )}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto"
              >
                <Check className="h-10 w-10 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold">You're all set!</h2>
              <p className="text-muted-foreground">Your workspace is ready</p>
              <div className="flex gap-3 justify-center pt-2">
                <Button onClick={() => { complete(); navigate('/dashboard/builder'); }}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />Explore Templates
                </Button>
                <Button variant="outline" onClick={() => { complete(); navigate('/dashboard/datasets'); }}>
                  <Upload className="h-4 w-4 mr-2" />Upload My Data
                </Button>
              </div>
            </div>
          )}

          {/* Progress dots */}
          <div className="flex gap-2 justify-center mt-6">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  i === step ? 'bg-primary w-6' : i < step ? 'bg-primary/40' : 'bg-muted-foreground/20'
                )}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
