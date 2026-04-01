import { motion } from 'framer-motion';
import { useState } from 'react';
import { BarChart3, Sparkles, Shield, Lightbulb } from 'lucide-react';

const screens = [
  {
    title: 'Interactive Dashboard Builder',
    description: 'Drag-and-drop grid with resizable charts',
    icon: BarChart3,
    gradient: 'from-blue-600 to-violet-600',
    preview: [
      { type: 'bars', heights: [40, 70, 55, 80, 45, 65, 90, 50] },
    ],
  },
  {
    title: 'AI Copilot',
    description: 'Natural language data exploration',
    icon: Sparkles,
    gradient: 'from-violet-600 to-purple-600',
    preview: [
      { type: 'chat' },
    ],
  },
  {
    title: 'Quality Scanner',
    description: 'Automated data health checks',
    icon: Shield,
    gradient: 'from-emerald-600 to-teal-600',
    preview: [
      { type: 'gauge', value: 89 },
    ],
  },
  {
    title: 'Smart Insights',
    description: 'AI-generated discoveries',
    icon: Lightbulb,
    gradient: 'from-amber-600 to-orange-600',
    preview: [
      { type: 'insights' },
    ],
  },
];

function AnimatedBars() {
  const heights = [40, 70, 55, 80, 45, 65, 90, 50];
  return (
    <div className="flex items-end gap-1.5 h-20 px-2">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.6, ease: 'easeOut' }}
          className="flex-1 rounded-t bg-gradient-to-t from-violet-500 to-blue-400 opacity-80"
        />
      ))}
    </div>
  );
}

function AnimatedGauge() {
  return (
    <div className="flex items-center justify-center h-20">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
          <motion.circle
            cx="50" cy="50" r="38" fill="none"
            stroke="hsl(160, 84%, 39%)"
            strokeWidth="6"
            strokeDasharray="239"
            initial={{ strokeDashoffset: 239 }}
            whileInView={{ strokeDashoffset: 239 * 0.11 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">89</span>
      </div>
    </div>
  );
}

export function ProductScreens() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="product-screens" className="py-28 relative">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold mb-5 tracking-tight">
            See <span className="gradient-text">DataVora</span> in Action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A glimpse into the powerful features that make data analysis effortless.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-10">
          {screens.map((screen, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === i
                  ? 'gradient-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'
              }`}
            >
              {screen.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Active screen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {screens.map((screen, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl bg-gradient-to-br ${screen.gradient} p-px shadow-2xl overflow-hidden`}
            >
              <div className="bg-card rounded-[15px] p-6 h-52 flex flex-col justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${screen.gradient} flex items-center justify-center shadow-md`}>
                    <screen.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{screen.title}</h3>
                    <p className="text-sm text-muted-foreground">{screen.description}</p>
                  </div>
                </div>

                <div className="mt-4">
                  {i === 0 && <AnimatedBars />}
                  {i === 2 && <AnimatedGauge />}
                  {i === 1 && (
                    <div className="space-y-2 px-2">
                      <div className="flex gap-2">
                        <div className="h-8 flex-1 rounded-lg bg-violet-500/20 shimmer-bg" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-6 w-2/3 rounded-lg bg-white/5" />
                      </div>
                    </div>
                  )}
                  {i === 3 && (
                    <div className="space-y-1.5 px-2">
                      {['Trend detected in revenue data', 'Anomaly found in Q3 sales'].map((text, j) => (
                        <motion.div
                          key={j}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: j * 0.2 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-xs text-muted-foreground">{text}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
