import { Zap, Github, Twitter, Linkedin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Footer() {
  const navigate = useNavigate();

  const links: Record<string, { label: string; action: () => void }[]> = {
    product: [
      { label: 'Features', action: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) },
      { label: 'Pricing', action: () => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }) },
      { label: 'Dashboard', action: () => navigate('/dashboard') },
      { label: 'Visualizations', action: () => navigate('/dashboard/visualizations') },
    ],
    resources: [
      { label: 'Documentation', action: () => navigate('/dashboard/settings') },
      { label: 'Tutorials', action: () => navigate('/dashboard/copilot') },
      { label: 'Data Quality', action: () => navigate('/dashboard/quality') },
      { label: 'Changelog', action: () => navigate('/dashboard/insights') },
    ],
    company: [
      { label: 'About', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
      { label: 'Overview', action: () => navigate('/dashboard') },
      { label: 'Contact', action: () => navigate('/dashboard/settings') },
      { label: 'Reports', action: () => navigate('/dashboard/reports') },
    ],
    legal: [
      { label: 'Privacy', action: () => navigate('/dashboard/settings') },
      { label: 'Terms', action: () => navigate('/dashboard/settings') },
      { label: 'Security', action: () => navigate('/dashboard/settings') },
      { label: 'Cookies', action: () => navigate('/dashboard/settings') },
    ],
  };

  return (
    <footer className="py-16 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">DataPulse</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enterprise-grade analytics, running locally.
            </p>
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

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DataPulse Analytics. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built with ❤️ for data enthusiasts
          </p>
        </div>
      </div>
    </footer>
  );
}
