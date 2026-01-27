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

  const handleGetStarted = () => {
    navigate('/dashboard');
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
