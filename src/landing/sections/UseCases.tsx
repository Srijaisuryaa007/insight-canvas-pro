import { motion } from 'framer-motion';
import { TrendingUp, Target, Cog, DollarSign, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const useCases = [
  {
    icon: TrendingUp,
    title: 'Sales Analytics',
    description: 'Track revenue, forecast trends, and identify your top performers. Visualize the entire sales funnel with interactive dashboards.',
  },
  {
    icon: Target,
    title: 'Marketing Performance',
    description: 'Campaign ROI, channel attribution, and audience insights. Know what\'s working and why with AI-driven analysis.',
  },
  {
    icon: Cog,
    title: 'Operations Monitoring',
    description: 'Real-time KPIs, efficiency metrics, and process optimization. Keep everything running smoothly with automated alerts.',
  },
  {
    icon: DollarSign,
    title: 'Financial Forecasting',
    description: 'Budget tracking, expense analysis, and predictive modeling. Make informed financial decisions with confidence.',
  },
  {
    icon: Shield,
    title: 'Data Quality Auditing',
    description: 'Ensure data integrity, catch anomalies, and maintain compliance. Trust your data completely with automated scans.',
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">
            Built for <span className="text-primary">Every Team</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From startups to enterprises, DataPulse adapts to your unique analytics needs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <Card className="h-full bg-card border-border overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <useCase.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2">{useCase.title}</h3>
                  <p className="text-muted-foreground">{useCase.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
