import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from './sections/Hero';
import { Features } from './sections/Features';
import { UseCases } from './sections/UseCases';
import { ProductScreens } from './sections/ProductScreens';
import { Pricing } from './sections/Pricing';
import { CallToAction } from './sections/CallToAction';
import { Footer } from './sections/Footer';

export default function LandingPage() {
  const navigate = useNavigate();

  // Apply persisted theme
  useEffect(() => {
    const stored = localStorage.getItem('datapulse_theme');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (stored === 'light') {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleGetStarted = () => {
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Hero onGetStarted={handleGetStarted} />
      <Features />
      <UseCases />
      <ProductScreens />
      <Pricing onGetStarted={handleGetStarted} />
      <CallToAction onGetStarted={handleGetStarted} />
      <Footer />
    </div>
  );
}
