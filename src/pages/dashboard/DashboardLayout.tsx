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
import { Loader2 } from 'lucide-react';

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
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
