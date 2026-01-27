import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

interface CallToActionProps {
  onGetStarted: () => void;
}

export function CallToAction({ onGetStarted }: CallToActionProps) {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-12 md:p-20 text-center overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-chart-1/30 to-transparent rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-6"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">No credit card required</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold mb-6"
            >
              Ready to Transform Your
              <span className="text-primary"> Data Analysis?</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground mb-8"
            >
              Join thousands of analysts who've upgraded their workflow. 
              Start for free, no strings attached.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Button size="lg" onClick={onGetStarted} className="gap-2 text-lg px-10 py-6">
                Start Analyzing Now
                <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
