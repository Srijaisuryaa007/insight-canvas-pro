import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { 
  BarChart3, Shield, Sparkles, Zap, Database, Globe, Lightbulb, Terminal
} from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Interactive Dashboards',
    description: 'Drag-and-drop dashboard builder with 38+ visualization types. Resize, customize, and share.',
    gradient: 'from-violet-500 to-blue-500',
  },
  {
    icon: Sparkles,
    title: 'AI Copilot',
    description: 'Natural language queries powered by advanced AI. Ask questions, get insights instantly.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Data Quality Engine',
    description: 'Automated scanning for missing values, duplicates, outliers with one-click fixes.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Lightbulb,
    title: 'Auto Insights',
    description: 'AI-generated trends, correlations, and anomalies. Discover patterns you\'d never find manually.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Database,
    title: 'Enterprise Security',
    description: 'Your data is protected with enterprise-grade security. Full control over your analytics pipeline.',
    gradient: 'from-slate-500 to-gray-500',
  },
  {
    icon: Globe,
    title: 'Web Scraping',
    description: 'Extract and analyze data from any website. Automated data collection for real-time insights.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Terminal,
    title: 'SQL Engine',
    description: 'Full SQL support with CTEs, window functions, and visual query builder. No limits.',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Zap,
    title: 'Real-time Analysis',
    description: 'Instant results as you upload. No waiting, no batch processing.',
    gradient: 'from-red-500 to-pink-500',
  },
];

export function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="features" className="py-28 relative">
      <div className="absolute inset-0 dot-grid opacity-50" />
      <div className="container mx-auto px-6 relative" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold mb-5 tracking-tight">
            Everything You Need for
            <span className="gradient-text ml-3">Data Excellence</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enterprise-grade analytics tools, beautifully designed and incredibly powerful.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <div className="group relative h-full rounded-2xl border border-border bg-card p-7 card-hover overflow-hidden cursor-pointer">
                {/* Gradient circle that expands on hover */}
                <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 transition-all duration-700 group-hover:scale-[3]`} />
                
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-white transition-colors duration-300">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed group-hover:text-white/70 transition-colors duration-300">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
