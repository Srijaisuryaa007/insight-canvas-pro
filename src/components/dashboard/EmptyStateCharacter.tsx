import { motion } from 'framer-motion';
import { Upload, BarChart3, Sparkles, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateCharacterProps {
  onUploadClick: () => void;
  isHoveringUpload?: boolean;
}

export function EmptyStateCharacter({ onUploadClick }: EmptyStateCharacterProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 select-none">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* Abstract geometric animation — premium SaaS style */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          {/* Middle ring */}
          <motion.div
            className="absolute inset-4 rounded-full border border-primary/15"
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
          {/* Inner glow */}
          <motion.div
            className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <BarChart3 className="h-12 w-12 text-primary/60" />
            </motion.div>
          </div>
          {/* Orbiting dots */}
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/40"
              style={{ top: '50%', left: '50%' }}
              animate={{
                x: [0, Math.cos(i * 2.09) * 70, 0],
                y: [0, Math.sin(i * 2.09) * 70, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{ duration: 4, delay: i * 1.3, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center space-y-4"
      >
        <h2 className="text-xl font-semibold text-foreground">
          Start by connecting your data
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Upload a CSV dataset or connect to a data source to unlock analytics, visualizations, and AI-powered insights.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button size="lg" className="gap-2" onClick={onUploadClick}>
            <Upload className="h-5 w-5" />
            Upload Data
          </Button>
        </div>
        <div className="flex items-center justify-center gap-6 pt-4 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5" />
            <span>10+ Connectors</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>30+ Charts</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Insights</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
