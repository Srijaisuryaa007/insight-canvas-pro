import { Lock, Sparkles, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { PlanType, PLANS } from '@/types/subscription';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  requiredPlan?: PlanType;
  title?: string;
  description?: string;
  compact?: boolean;
}

export function UpgradePrompt({ 
  feature, 
  requiredPlan,
  title,
  description,
  compact = false 
}: UpgradePromptProps) {
  const { getRequiredPlan, plan } = useSubscription();
  const navigate = useNavigate();
  
  const required = requiredPlan || getRequiredPlan(feature);
  const planConfig = PLANS[required];

  const PlanIcon = required === 'enterprise' ? Crown : required === 'pro' ? Sparkles : Zap;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground flex-1">
          {title || `Requires ${planConfig.name} plan`}
        </span>
        <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/settings')}>
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <PlanIcon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-2">
          {title || `Upgrade to ${planConfig.name}`}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
          {description || `This feature requires the ${planConfig.name} plan (${planConfig.priceLabel}). Upgrade to unlock ${feature.replace(/-/g, ' ')} and more.`}
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => navigate('/dashboard/settings')}>
            View Plans
          </Button>
          {plan === 'free' && (
            <Button variant="outline" onClick={() => navigate('/dashboard/settings')}>
              Compare Features
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for checking feature access with toast
export function useFeatureAccess() {
  const { isFeatureAvailable, meetsPlanRequirement, getRequiredPlan, isFree, isAIAvailable } = useSubscription();

  const checkAccess = (feature: string): boolean => {
    const required = getRequiredPlan(feature);
    return meetsPlanRequirement(required) && isFeatureAvailable(feature);
  };

  const checkAIAccess = (): boolean => {
    return isAIAvailable();
  };

  return {
    checkAccess,
    checkAIAccess,
    isFree,
    isAIAvailable: isAIAvailable()
  };
}
