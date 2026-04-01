import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, BarChart3, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeroProps {
  onGetStarted: () => void;
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const headlineWords = ['Transform', 'Data', 'Into'];
const gradientWords = ['Actionable', 'Insights'];

export function Hero({ onGetStarted }: HeroProps) {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Deep dark background */}
      <div className="absolute inset-0 bg-background" />

      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.15]"
          style={{
            background: 'hsl(263 70% 50%)',
            filter: 'blur(120px)',
            top: '10%', left: '20%',
            animation: 'floatOrb 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-[0.1]"
          style={{
            background: 'hsl(217 91% 60%)',
            filter: 'blur(100px)',
            top: '40%', right: '15%',
            animation: 'floatOrb 15s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute w-[250px] h-[250px] rounded-full opacity-[0.08]"
          style={{
            background: 'hsl(187 92% 42%)',
            filter: 'blur(80px)',
            bottom: '20%', left: '40%',
            animation: 'floatOrb 10s ease-in-out infinite 2s',
          }}
        />
      </div>

      {/* Dot grid overlay */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Top Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-20">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-lg text-foreground tracking-tight">DataVora</span>
          </button>
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Use Cases', 'Pricing'].map(item => (
              <button
                key={item}
                onClick={() => document.getElementById(item.toLowerCase().replace(' ', '-'))?.scrollIntoView({ behavior: 'smooth' })}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="text-muted-foreground hover:text-foreground">
              Log In
            </Button>
            <Button size="sm" onClick={() => navigate('/signup')} className="gradient-primary border-0 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
              Sign Up
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full"
            style={{
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.3)',
            }}
          >
            <div className="w-2 h-2 rounded-full gradient-primary" style={{ animation: 'spinSlow 3s linear infinite' }} />
            <span className="text-sm font-medium text-foreground/90">✨ AI-Powered Analytics Platform</span>
          </motion.div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
              {headlineWords.map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="inline-block mr-4 text-foreground"
                >
                  {word}
                </motion.span>
              ))}
              <br />
              {gradientWords.map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                  className="inline-block mr-4 gradient-text"
                >
                  {word}
                </motion.span>
              ))}
            </h1>
          </div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            DataVora combines enterprise-grade visualization, AI-powered analysis, and 
            advanced data quality tools — with enterprise security.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-2"
          >
            <Button
              size="lg"
              onClick={onGetStarted}
              className="relative gradient-primary border-0 text-white gap-2 text-base px-8 py-6 rounded-xl font-semibold shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.03] active:scale-[0.98] transition-all"
            >
              Start Analyzing
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="glass-card gap-2 text-base px-8 py-6 rounded-xl font-semibold hover:bg-white/10 transition-all"
              onClick={() => document.getElementById('product-screens')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Play className="h-5 w-5" />
              See in Action
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="pt-16 flex items-center justify-center gap-0 max-w-2xl mx-auto"
          >
            {[
              { label: 'Chart Types', value: 38, suffix: '+' },
              { label: 'AI Models', value: 3, suffix: '' },
              { label: 'Enterprise Security', value: 100, suffix: '%' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center">
                {i > 0 && <div className="h-10 w-px bg-white/10 mx-8" />}
                <div className="text-center">
                  <div className="text-3xl font-extrabold gradient-text">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
        >
          <motion.div className="w-1 h-2 bg-primary rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
