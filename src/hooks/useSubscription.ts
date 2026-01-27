import { useState, useEffect, useCallback } from 'react';
import { PlanType, PLANS, CREDIT_COSTS, CreditAction, CHART_TYPES_BY_PLAN, FEATURES_BY_PLAN } from '@/types/subscription';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'datapulse_subscription';

interface SubscriptionState {
  plan: PlanType;
  credits: number;
  purchasedCredits: number;
  upgradeDate?: string;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      plan: 'free',
      credits: PLANS.free.credits,
      purchasedCredits: 0
    };
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const currentPlan = PLANS[state.plan];
  const isEnterprise = state.plan === 'enterprise';
  const totalCredits = isEnterprise ? Infinity : state.credits + state.purchasedCredits;

  // Check if action can be performed
  const canPerformAction = useCallback((action: CreditAction): boolean => {
    if (isEnterprise) return true;
    const cost = CREDIT_COSTS[action];
    return totalCredits >= cost;
  }, [isEnterprise, totalCredits]);

  // Consume credits for an action
  const consumeCredits = useCallback((action: CreditAction): boolean => {
    if (isEnterprise) return true;
    
    const cost = CREDIT_COSTS[action];
    if (totalCredits < cost) {
      toast({
        title: 'Insufficient Credits',
        description: `This action requires ${cost} credits. You have ${totalCredits} remaining.`,
        variant: 'destructive'
      });
      return false;
    }

    setState(prev => {
      // First use purchased credits, then plan credits
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

    toast({
      title: 'Credits Used',
      description: `${cost} credits consumed for ${action.replace('-', ' ')}.`
    });

    return true;
  }, [isEnterprise, totalCredits]);

  // Upgrade plan
  const upgradePlan = useCallback((newPlan: PlanType) => {
    const planConfig = PLANS[newPlan];
    setState(prev => ({
      ...prev,
      plan: newPlan,
      credits: planConfig.credits === -1 ? Infinity : planConfig.credits,
      upgradeDate: new Date().toISOString()
    }));

    toast({
      title: 'Plan Upgraded!',
      description: `You're now on the ${planConfig.name} plan.`
    });
  }, []);

  // Buy additional credits
  const buyCredits = useCallback((amount: number) => {
    setState(prev => ({
      ...prev,
      purchasedCredits: prev.purchasedCredits + amount
    }));

    toast({
      title: 'Credits Purchased!',
      description: `${amount} credits added to your account.`
    });
  }, []);

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

  // Get credit cost for action
  const getCreditCost = useCallback((action: CreditAction): number => {
    return CREDIT_COSTS[action];
  }, []);

  return {
    plan: state.plan,
    planConfig: currentPlan,
    credits: isEnterprise ? Infinity : totalCredits,
    isEnterprise,
    canPerformAction,
    consumeCredits,
    upgradePlan,
    buyCredits,
    isChartAvailable,
    getAvailableCharts,
    isFeatureAvailable,
    canAddDataset,
    getCreditCost
  };
}
