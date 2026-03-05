import { Zap, Github, Twitter, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Footer() {
  const navigate = useNavigate();

  const links: Record<string, { label: string; action: () => void }[]> = {
    product: [
      { label: 'Dashboard Builder', action: () => navigate('/dashboard/builder') },
      { label: 'AI Copilot', action: () => navigate('/dashboard/copilot') },
      { label: 'Visualizations', action: () => navigate('/dashboard/visualizations') },
      { label: 'Data Quality', action: () => navigate('/dashboard/quality') },
      { label: 'Report Generator', action: () => navigate('/dashboard/reports') },
    ],
    resources: [
      { label: 'Getting Started', action: () => navigate('/signup') },
      { label: 'Documentation', action: () => navigate('/dashboard/settings') },
      { label: 'API Reference', action: () => navigate('/dashboard/settings') },
      { label: 'Tutorials', action: () => navigate('/dashboard/copilot') },
      { label: 'Changelog', action: () => navigate('/dashboard/insights') },
    ],
    company: [
      { label: 'About DataPulse', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
      { label: 'Careers', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
      { label: 'Blog', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
      { label: 'Press Kit', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
      { label: 'Contact Us', action: () => navigate('/dashboard/settings') },
    ],
    legal: [
      { label: 'Privacy Policy', action: () => navigate('/dashboard/settings') },
      { label: 'Terms of Service', action: () => navigate('/dashboard/settings') },
      { label: 'Cookie Policy', action: () => navigate('/dashboard/settings') },
      { label: 'Security', action: () => navigate('/dashboard/settings') },
      { label: 'GDPR Compliance', action: () => navigate('/dashboard/settings') },
    ],
  };

  return (
    <footer className="py-16 border-t border-border bg-muted/20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">DataPulse</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Enterprise-grade analytics platform that transforms your raw data into actionable insights. AI-powered, privacy-first, and built for teams of all sizes.
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>hello@datapulse.dev</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>San Francisco, CA</span>
              </div>
            </div>
            <div className="flex gap-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4 capitalize">{category}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={item.action}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DataPulse Analytics. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/dashboard/settings')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</button>
            <button onClick={() => navigate('/dashboard/settings')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate('/dashboard/settings')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sitemap</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
