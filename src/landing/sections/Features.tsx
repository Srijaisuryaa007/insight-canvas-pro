import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Shield, 
  Sparkles, 
  Zap, 
  Database, 
  Lock,
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: BarChart3,
    title: 'Power BI-Style Dashboards',
    description: 'Interactive, resizable chart grids with 30+ visualization types. Drag, drop, and customize.',
  },
  {
    icon: Sparkles,
    title: 'AI Copilot',
    description: 'Natural language queries powered by advanced AI. Ask questions, get insights instantly.',
  },
  {
    icon: Shield,
    title: 'Data Quality Engine',
    description: 'Automated scanning for missing values, duplicates, outliers with one-click fixes.',
  },
  {
    icon: Lightbulb,
    title: 'Auto Insights',
    description: 'AI-generated trends, correlations, and anomalies. Discover patterns you\'d never find manually.',
  },
  {
    icon: Lock,
    title: '100% Local',
    description: 'Your data never leaves your machine. No cloud dependency, no privacy concerns.',
  },
  {
    icon: TrendingUp,
    title: 'Forecasting',
    description: 'Time-series predictions with confidence intervals. See what\'s coming next.',
  },
  {
    icon: Database,
    title: 'Schema Detection',
    description: 'Automatic column profiling, type inference, and data characterization.',
  },
  {
    icon: Zap,
    title: 'Real-time Analysis',
    description: 'Instant results as you upload. No waiting, no batch processing.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">
            Everything You Need for
            <span className="text-primary"> Data Excellence</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enterprise-grade analytics tools, beautifully designed and incredibly powerful.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Card className="h-full bg-card border-border hover:border-primary/50 transition-colors group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
