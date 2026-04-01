import { motion } from 'framer-motion';
import { TrendingUp, Target, Cog, DollarSign, Shield } from 'lucide-react';

const useCases = [
  {
    icon: TrendingUp,
    title: 'Sales Analytics',
    description: 'Track revenue, forecast trends, and identify your top performers with interactive dashboards.',
    gradient: 'from-blue-500 to-violet-500',
  },
  {
    icon: Target,
    title: 'Marketing Performance',
    description: 'Campaign ROI, channel attribution, and audience insights with AI-driven analysis.',
    gradient: 'from-violet-500 to-pink-500',
  },
  {
    icon: Cog,
    title: 'Operations Monitoring',
    description: 'Real-time KPIs, efficiency metrics, and process optimization with automated alerts.',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    icon: DollarSign,
    title: 'Financial Forecasting',
    description: 'Budget tracking, expense analysis, and predictive modeling for informed decisions.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Shield,
    title: 'Data Quality Auditing',
    description: 'Ensure data integrity, catch anomalies, and maintain compliance with automated scans.',
    gradient: 'from-emerald-500 to-teal-500',
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="py-28">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold mb-5 tracking-tight">
            Built for <span className="gradient-text">Every Team</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From startups to enterprises, DataVora adapts to your unique analytics needs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {useCases.map((useCase, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <div className="group h-full rounded-2xl border border-border bg-card p-7 card-hover cursor-pointer overflow-hidden relative">
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${useCase.gradient} flex items-center justify-center mb-5 shadow-lg`}>
                    <useCase.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-foreground">{useCase.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{useCase.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
