import { BarChart3, Mail, Twitter, Linkedin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Footer() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="py-16 border-t border-border relative">
      <div className="absolute inset-0 dot-grid opacity-20" />
      <div className="container mx-auto px-6 relative">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-lg text-foreground">DataVora</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs leading-relaxed">
              AI-powered analytics platform that turns raw data into actionable insights. Built for startups and growing teams.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Mail className="h-4 w-4" />
              <span>support@datavora.in</span>
            </div>
            <div className="flex gap-3">
              {[Twitter, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold mb-4 text-foreground text-sm uppercase tracking-wider">Product</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Features', action: () => scrollToSection('features') },
                { label: 'Pricing', action: () => scrollToSection('pricing') },
                { label: 'Use Cases', action: () => scrollToSection('use-cases') },
                { label: 'Get Started', action: () => navigate('/signup') },
              ].map(item => (
                <li key={item.label}>
                  <button onClick={item.action} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold mb-4 text-foreground text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-2.5">
              <li><button onClick={() => navigate('/signup')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Getting Started</button></li>
              <li><a href="mailto:support@datavora.in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold mb-4 text-foreground text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2.5">
              <li><button onClick={() => navigate('/privacy')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</button></li>
              <li><button onClick={() => navigate('/terms')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</button></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DataVora Analytics. All rights reserved.
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
