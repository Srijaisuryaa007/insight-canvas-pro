import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { BarChart3, Sparkles, Shield, Lightbulb } from 'lucide-react';

const screens = [
  {
    title: 'Interactive Dashboard',
    description: 'Power BI-style grid with resizable charts',
    icon: BarChart3,
    gradient: 'from-blue-600 to-violet-600',
  },
  {
    title: 'AI Copilot',
    description: 'Natural language data exploration',
    icon: Sparkles,
    gradient: 'from-violet-600 to-purple-600',
  },
  {
    title: 'Quality Scanner',
    description: 'Automated data health checks',
    icon: Shield,
    gradient: 'from-emerald-600 to-teal-600',
  },
  {
    title: 'Smart Insights',
    description: 'AI-generated discoveries',
    icon: Lightbulb,
    gradient: 'from-amber-600 to-orange-600',
  },
];

export function ProductScreens() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return (
    <section ref={containerRef} className="py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">
            See <span className="text-primary">DataPulse</span> in Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A glimpse into the powerful features that make data analysis effortless.
          </p>
        </motion.div>

        <motion.div style={{ y, opacity }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {screens.map((screen, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className={`relative rounded-2xl bg-gradient-to-br ${screen.gradient} p-1 shadow-2xl`}
            >
              <div className="bg-card rounded-xl p-6 h-48 flex flex-col justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <screen.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{screen.title}</h3>
                    <p className="text-sm text-muted-foreground">{screen.description}</p>
                  </div>
                </div>

                {/* Mock UI elements */}
                <div className="space-y-2 mt-4">
                  <div className="flex gap-2">
                    <div className="h-2 w-1/3 bg-muted rounded-full" />
                    <div className="h-2 w-1/4 bg-muted rounded-full" />
                    <div className="h-2 w-1/5 bg-primary/30 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 flex-1 bg-muted rounded" />
                    <div className="h-8 flex-1 bg-muted rounded" />
                    <div className="h-8 flex-1 bg-primary/20 rounded" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
