import { useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { UpgradeModal } from '@/components/dashboard/UpgradeModal';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { ProductTour } from '@/components/onboarding/ProductTour';
import { KeyboardShortcuts } from '@/components/dashboard/KeyboardShortcuts';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless toggled */}
      <div className={cn(
        "lg:relative lg:block",
        mobileSidebarOpen 
          ? "fixed inset-y-0 left-0 z-50" 
          : "hidden lg:block"
      )}>
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar with hamburger */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-border bg-background">
          <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
            {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="font-semibold text-sm">DataPulse</span>
        </div>
        <TopBar />
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette
        onUploadDataset={() => navigate('/dashboard/datasets')}
        onRunQuality={() => navigate('/dashboard/quality')}
        onGenerateInsights={() => navigate('/dashboard/insights')}
        onAskCopilot={() => navigate('/dashboard/copilot')}
      />
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <OnboardingFlow />
      <ProductTour />
      <KeyboardShortcuts />
    </div>
  );
}
