import { Zap, Mail, Twitter, Linkedin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Footer() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="py-16 border-t border-border bg-muted/20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">DataPulse</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              AI-powered analytics platform that turns raw data into actionable insights. Built for startups and growing teams.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Mail className="h-4 w-4" />
              <span>support@datapulse.dev</span>
            </div>
            <div className="flex gap-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><button onClick={() => scrollToSection('features')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">Features</button></li>
              <li><button onClick={() => scrollToSection('pricing')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">Pricing</button></li>
              <li><button onClick={() => scrollToSection('use-cases')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">Use Cases</button></li>
              <li><button onClick={() => navigate('/signup')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">Get Started</button></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><button onClick={() => navigate('/signup')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">Getting Started</button></li>
              <li><a href="mailto:support@datapulse.dev" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><button onClick={() => navigate('/privacy')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">Privacy Policy</button></li>
              <li><button onClick={() => navigate('/terms')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">Terms of Service</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DataPulse Analytics. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/privacy')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</button>
            <button onClick={() => navigate('/terms')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
