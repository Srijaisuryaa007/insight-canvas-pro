import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Upload, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateCharacterProps {
  onUploadClick: () => void;
  isHoveringUpload?: boolean;
}

export function EmptyStateCharacter({ onUploadClick, isHoveringUpload }: EmptyStateCharacterProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [mood, setMood] = useState<'idle' | 'attentive' | 'happy'>('idle');
  const [breathPhase, setBreathPhase] = useState(0);
  const animFrameRef = useRef<number>(0);

  // Mouse tracking
  useEffect(() => {
    if (prefersReducedMotion) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion]);

  // Blinking
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    };
    const interval = setInterval(blink, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Breathing animation
  useEffect(() => {
    if (prefersReducedMotion) return;
    let frame = 0;
    const animate = () => {
      frame++;
      setBreathPhase(Math.sin(frame * 0.02) * 2);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [prefersReducedMotion]);

  // Mood based on hover state
  useEffect(() => {
    setMood(isHoveringUpload ? 'attentive' : 'idle');
  }, [isHoveringUpload]);

  const handleUploadClick = () => {
    setMood('happy');
    onUploadClick();
    setTimeout(() => setMood('idle'), 2000);
  };

  const eyeOffsetX = (mousePos.x - 0.5) * 6;
  const eyeOffsetY = (mousePos.y - 0.5) * 4;
  const headTilt = (mousePos.x - 0.5) * 5;

  const getMouthPath = () => {
    switch (mood) {
      case 'happy': return 'M 85 125 Q 100 140 115 125';
      case 'attentive': return 'M 90 127 Q 100 132 110 127';
      default: return 'M 92 128 Q 100 130 108 128';
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center py-16 px-4 select-none">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        {/* Character SVG */}
        <svg
          width="200"
          height="220"
          viewBox="0 0 200 220"
          className="drop-shadow-lg"
        >
          {/* Body */}
          <motion.g
            animate={{ y: breathPhase }}
            transition={{ type: 'tween', ease: 'easeInOut' }}
          >
            {/* Torso */}
            <ellipse cx="100" cy="190" rx="40" ry="25" fill="hsl(var(--primary))" opacity="0.15" />
            <rect x="75" y="145" width="50" height="45" rx="8" fill="hsl(var(--primary))" opacity="0.2" />

            {/* Head */}
            <motion.g
              animate={{ rotate: headTilt }}
              style={{ transformOrigin: '100px 95px' }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            >
              {/* Head shape */}
              <ellipse cx="100" cy="90" rx="38" ry="42" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2" />

              {/* Hair */}
              <path d="M 62 78 Q 70 40 100 38 Q 130 40 138 78" fill="hsl(var(--primary))" opacity="0.3" />
              <path d="M 65 75 Q 75 45 100 42 Q 125 45 135 75" fill="hsl(var(--primary))" opacity="0.2" />

              {/* Eyes */}
              <g>
                {/* Left eye */}
                <ellipse cx={85 + eyeOffsetX * 0.3} cy={85 + eyeOffsetY * 0.3} rx="8" ry={isBlinking ? 1 : 8} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
                {!isBlinking && (
                  <>
                    <circle cx={85 + eyeOffsetX} cy={85 + eyeOffsetY} r="4" fill="hsl(var(--foreground))" />
                    <circle cx={86 + eyeOffsetX} cy={83 + eyeOffsetY} r="1.5" fill="hsl(var(--card))" />
                  </>
                )}
                {/* Right eye */}
                <ellipse cx={115 + eyeOffsetX * 0.3} cy={85 + eyeOffsetY * 0.3} rx="8" ry={isBlinking ? 1 : 8} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
                {!isBlinking && (
                  <>
                    <circle cx={115 + eyeOffsetX} cy={85 + eyeOffsetY} r="4" fill="hsl(var(--foreground))" />
                    <circle cx={116 + eyeOffsetX} cy={83 + eyeOffsetY} r="1.5" fill="hsl(var(--card))" />
                  </>
                )}
              </g>

              {/* Eyebrows */}
              <motion.line
                x1="77" y1={mood === 'attentive' ? 70 : 73}
                x2="93" y2={mood === 'attentive' ? 68 : 73}
                stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" opacity="0.5"
              />
              <motion.line
                x1="107" y1={mood === 'attentive' ? 68 : 73}
                x2="123" y2={mood === 'attentive' ? 70 : 73}
                stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" opacity="0.5"
              />

              {/* Mouth */}
              <motion.path
                d={getMouthPath()}
                fill="none"
                stroke="hsl(var(--foreground))"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.6"
              />

              {/* Blush - shows when happy */}
              {mood === 'happy' && (
                <>
                  <circle cx="72" cy="100" r="6" fill="hsl(var(--chart-1))" opacity="0.3" />
                  <circle cx="128" cy="100" r="6" fill="hsl(var(--chart-1))" opacity="0.3" />
                </>
              )}
            </motion.g>

            {/* Arms */}
            <motion.path
              d={mood === 'happy' ? 'M 75 155 Q 55 135 50 115' : 'M 75 155 Q 60 165 55 175'}
              fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" opacity="0.2"
            />
            <motion.path
              d={mood === 'happy' ? 'M 125 155 Q 145 135 150 115' : 'M 125 155 Q 140 165 145 175'}
              fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" opacity="0.2"
            />
          </motion.g>

          {/* Sparkles for happy state */}
          {mood === 'happy' && (
            <>
              <motion.circle
                cx="45" cy="70" r="3" fill="hsl(var(--chart-1))"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, repeat: 2 }}
              />
              <motion.circle
                cx="155" cy="65" r="2.5" fill="hsl(var(--chart-2))"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, delay: 0.2, repeat: 2 }}
              />
              <motion.circle
                cx="50" cy="110" r="2" fill="hsl(var(--chart-4))"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, delay: 0.4, repeat: 2 }}
              />
            </>
          )}
        </svg>
      </motion.div>

      {/* Text + CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center mt-6 space-y-4"
      >
        <h2 className="text-xl font-semibold text-foreground">
          {mood === 'happy' ? '🎉 Let\'s get started!' : 'No data yet — let\'s change that!'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Upload a CSV dataset to unlock AI-powered analytics, visualizations, and insights.
        </p>
        <Button
          size="lg"
          className="gap-2 mt-2"
          onClick={handleUploadClick}
          onMouseEnter={() => setMood('attentive')}
          onMouseLeave={() => mood !== 'happy' && setMood('idle')}
        >
          <Upload className="h-5 w-5" />
          Upload Data
        </Button>
      </motion.div>
    </div>
  );
}
