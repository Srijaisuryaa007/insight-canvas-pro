import { useState, useEffect, useCallback } from 'react';
import { PlanType, PLANS, CREDIT_COSTS, CreditAction, CHART_TYPES_BY_PLAN, FEATURES_BY_PLAN, PLAN_REQUIRED_FOR_ACTION } from '@/types/subscription';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'datapulse_subscription';

interface SubscriptionState {
  plan: PlanType;
  credits: number;
  purchasedCredits: number;
  upgradeDate?: string;
  subscriptionEndDate?: string;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate plan exists
        if (parsed.plan && PLANS[parsed.plan as PlanType]) {
          return {
            plan: parsed.plan,
            credits: parsed.credits ?? PLANS[parsed.plan as PlanType].credits,
            purchasedCredits: parsed.purchasedCredits ?? 0,
            upgradeDate: parsed.upgradeDate,
            subscriptionEndDate: parsed.subscriptionEndDate
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse subscription state:', e);
    }
    return {
      plan: 'free' as PlanType,
      credits: PLANS.free.credits,
      purchasedCredits: 0
    };
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Ensure currentPlan is always valid
  const currentPlan = PLANS[state.plan] || PLANS.free;
  const isEnterprise = state.plan === 'enterprise';
  const isFree = state.plan === 'free';
  const totalCredits = isEnterprise ? Infinity : (state.credits ?? 0) + (state.purchasedCredits ?? 0);

  // Get minimum required plan for an action
  const getRequiredPlan = useCallback((action: string): PlanType => {
    return PLAN_REQUIRED_FOR_ACTION[action] || 'free';
  }, []);

  // Check if current plan meets requirement
  const meetsPlanRequirement = useCallback((requiredPlan: PlanType): boolean => {
    const planHierarchy: PlanType[] = ['free', 'basic', 'pro', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(state.plan);
    const requiredIndex = planHierarchy.indexOf(requiredPlan);
    return currentIndex >= requiredIndex;
  }, [state.plan]);

  // Check if action can be performed (plan + credits)
  const canPerformAction = useCallback((action: CreditAction): boolean => {
    // Check plan requirement first
    const requiredPlan = getRequiredPlan(action);
    if (!meetsPlanRequirement(requiredPlan)) {
      return false;
    }
    
    if (isEnterprise) return true;
    const cost = CREDIT_COSTS[action];
    return totalCredits >= cost;
  }, [isEnterprise, totalCredits, getRequiredPlan, meetsPlanRequirement]);

  // Consume credits for an action (with plan check)
  const consumeCredits = useCallback((action: CreditAction): boolean => {
    // Check plan requirement
    const requiredPlan = getRequiredPlan(action);
    if (!meetsPlanRequirement(requiredPlan)) {
      toast({
        title: 'Upgrade Required',
        description: `This feature requires ${PLANS[requiredPlan].name} plan or higher.`,
        variant: 'destructive'
      });
      return false;
    }

    if (isEnterprise) return true;
    
    const cost = CREDIT_COSTS[action];
    if (totalCredits < cost) {
      toast({
        title: 'Insufficient Credits',
        description: `This action requires ${cost} credits. You have ${totalCredits} remaining. Purchase more credits or upgrade your plan.`,
        variant: 'destructive'
      });
      return false;
    }

    setState(prev => {
      let newPurchased = prev.purchasedCredits;
      let newCredits = prev.credits;
      let remaining = cost;

      if (newPurchased >= remaining) {
        newPurchased -= remaining;
      } else {
        remaining -= newPurchased;
        newPurchased = 0;
        newCredits -= remaining;
      }

      return {
        ...prev,
        credits: newCredits,
        purchasedCredits: newPurchased
      };
    });

    return true;
  }, [isEnterprise, totalCredits, getRequiredPlan, meetsPlanRequirement]);

  // Upgrade plan (requires payment verification)
  const upgradePlan = useCallback((newPlan: PlanType, paymentVerified: boolean = false) => {
    if (newPlan === 'free') {
      // Downgrade to free is always allowed
      setState(prev => ({
        ...prev,
        plan: 'free',
        credits: PLANS.free.credits,
      }));
      toast({ title: 'Plan Changed', description: 'You are now on the Free plan.' });
      return;
    }

    if (!paymentVerified) {
      toast({
        title: 'Payment Required',
        description: `Please complete payment to upgrade to ${PLANS[newPlan].name}.`,
        variant: 'destructive'
      });
      return;
    }

    const planConfig = PLANS[newPlan];
    setState(prev => ({
      ...prev,
      plan: newPlan,
      credits: planConfig.credits === -1 ? Infinity : planConfig.credits,
      upgradeDate: new Date().toISOString(),
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }));

    toast({
      title: 'Plan Upgraded!',
      description: `You're now on the ${planConfig.name} plan with ${planConfig.credits === -1 ? 'unlimited' : planConfig.credits} credits.`
    });
  }, []);

  // Add credits after verified payment
  const addVerifiedCredits = useCallback((amount: number, paymentId?: string) => {
    setState(prev => ({
      ...prev,
      purchasedCredits: prev.purchasedCredits + amount
    }));

    toast({
      title: 'Credits Added!',
      description: `${amount} credits added to your account.${paymentId ? ` (Payment: ${paymentId.slice(-8)})` : ''}`
    });
  }, []);

  // Legacy buyCredits - requires payment verification
  const buyCredits = useCallback((amount: number, paymentVerified: boolean = false) => {
    if (!paymentVerified) {
      toast({
        title: 'Payment Required',
        description: 'Please complete payment to purchase credits.',
        variant: 'destructive'
      });
      return;
    }
    addVerifiedCredits(amount);
  }, [addVerifiedCredits]);

  // Check if chart type is available
  const isChartAvailable = useCallback((chartType: string): boolean => {
    return CHART_TYPES_BY_PLAN[state.plan].includes(chartType);
  }, [state.plan]);

  // Get available charts for current plan
  const getAvailableCharts = useCallback((): string[] => {
    return CHART_TYPES_BY_PLAN[state.plan];
  }, [state.plan]);

  // Check if feature is available
  const isFeatureAvailable = useCallback((feature: string): boolean => {
    return FEATURES_BY_PLAN[state.plan].includes(feature);
  }, [state.plan]);

  // Check dataset limit
  const canAddDataset = useCallback((currentCount: number): boolean => {
    if (currentPlan.maxDatasets === -1) return true;
    return currentCount < currentPlan.maxDatasets;
  }, [currentPlan]);

  // Check row limit
  const canIngestRows = useCallback((rowCount: number): { allowed: boolean; maxRows: number } => {
    if (currentPlan.maxRows === -1) return { allowed: true, maxRows: -1 };
    return { allowed: rowCount <= currentPlan.maxRows, maxRows: currentPlan.maxRows };
  }, [currentPlan]);

  // Get credit cost for action
  const getCreditCost = useCallback((action: CreditAction): number => {
    return CREDIT_COSTS[action];
  }, []);

  // Check if AI is available
  const isAIAvailable = useCallback((): boolean => {
    return currentPlan.aiModels.length > 0;
  }, [currentPlan]);

  // Get upgrade message for locked feature
  const getUpgradeMessage = useCallback((feature: string): string => {
    const requiredPlan = getRequiredPlan(feature);
    return `Upgrade to ${PLANS[requiredPlan].name} to unlock this feature.`;
  }, [getRequiredPlan]);

  return {
    plan: state.plan,
    planConfig: currentPlan,
    credits: isEnterprise ? Infinity : totalCredits,
    isEnterprise,
    isFree,
    canPerformAction,
    consumeCredits,
    upgradePlan,
    buyCredits,
    addVerifiedCredits,
    isChartAvailable,
    getAvailableCharts,
    isFeatureAvailable,
    canAddDataset,
    canIngestRows,
    getCreditCost,
    isAIAvailable,
    getRequiredPlan,
    meetsPlanRequirement,
    getUpgradeMessage
  };
}
