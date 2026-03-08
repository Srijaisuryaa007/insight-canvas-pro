import { useState, useEffect, useCallback } from 'react';
import { PlanType, PLANS, CREDIT_COSTS, CreditAction, CHART_TYPES_BY_PLAN, FEATURES_BY_PLAN, PLAN_REQUIRED_FOR_ACTION } from '@/types/subscription';
import { toast } from '@/hooks/use-toast';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface SubscriptionState {
  plan: PlanType;
  credits: number;
  purchasedCredits: number;
  upgradeDate?: string;
  subscriptionEndDate?: string;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    plan: 'free' as PlanType,
    credits: PLANS.free.credits,
    purchasedCredits: 0
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const loadSub = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);

      const { data } = await supabase.from('subscription_state')
        .select('*').eq('user_id', session.user.id).maybeSingle();

      if (data) {
        setState({
          plan: (data.plan as PlanType) || 'free',
          credits: data.credits ?? PLANS.free.credits,
          purchasedCredits: data.purchased_credits ?? 0,
          upgradeDate: data.upgrade_date,
          subscriptionEndDate: data.subscription_end_date,
        });
        setLoaded(true);
      } else {
        // Create initial subscription state
        await supabase.from('subscription_state').insert({
          user_id: session.user.id, plan: 'free',
          credits: PLANS.free.credits, purchased_credits: 0,
        });
        setLoaded(true);
      }
    };

    loadSub();
  }, []);

  // Persist to Supabase on state change
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !userId || !loaded) return;
    supabase.from('subscription_state').update({
      plan: state.plan, credits: state.credits,
      purchased_credits: state.purchasedCredits,
      upgrade_date: state.upgradeDate || null,
      subscription_end_date: state.subscriptionEndDate || null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId).then();
  }, [state, userId]);

  const currentPlan = PLANS[state.plan] || PLANS.free;
  const isEnterprise = state.plan === 'enterprise';
  const isFree = state.plan === 'free';
  const totalCredits = isEnterprise ? Infinity : (state.credits ?? 0) + (state.purchasedCredits ?? 0);

  const getRequiredPlan = useCallback((action: string): PlanType => {
    return PLAN_REQUIRED_FOR_ACTION[action] || 'free';
  }, []);

  const meetsPlanRequirement = useCallback((requiredPlan: PlanType): boolean => {
    const planHierarchy: PlanType[] = ['free', 'basic', 'pro', 'enterprise'];
    return planHierarchy.indexOf(state.plan) >= planHierarchy.indexOf(requiredPlan);
  }, [state.plan]);

  const canPerformAction = useCallback((action: CreditAction): boolean => {
    const requiredPlan = getRequiredPlan(action);
    if (!meetsPlanRequirement(requiredPlan)) return false;
    if (isEnterprise) return true;
    return totalCredits >= CREDIT_COSTS[action];
  }, [isEnterprise, totalCredits, getRequiredPlan, meetsPlanRequirement]);

  const consumeCredits = useCallback((action: CreditAction): boolean => {
    const requiredPlan = getRequiredPlan(action);
    if (!meetsPlanRequirement(requiredPlan)) {
      toast({ title: 'Upgrade Required', description: `This feature requires ${PLANS[requiredPlan].name} plan or higher.`, variant: 'destructive' });
      return false;
    }
    if (isEnterprise) return true;
    const cost = CREDIT_COSTS[action];
    if (totalCredits < cost) {
      toast({ title: 'Insufficient Credits', description: `This action requires ${cost} credits. You have ${totalCredits} remaining.`, variant: 'destructive' });
      return false;
    }
    setState(prev => {
      let newPurchased = prev.purchasedCredits;
      let newCredits = prev.credits;
      let remaining = cost;
      if (newPurchased >= remaining) { newPurchased -= remaining; }
      else { remaining -= newPurchased; newPurchased = 0; newCredits -= remaining; }
      return { ...prev, credits: newCredits, purchasedCredits: newPurchased };
    });
    return true;
  }, [isEnterprise, totalCredits, getRequiredPlan, meetsPlanRequirement]);

  const upgradePlan = useCallback((newPlan: PlanType, paymentVerified: boolean = false) => {
    if (newPlan === 'free') {
      setState(prev => ({ ...prev, plan: 'free', credits: PLANS.free.credits }));
      toast({ title: 'Plan Changed', description: 'You are now on the Free plan.' });
      return;
    }
    if (!paymentVerified) {
      toast({ title: 'Payment Required', description: `Please complete payment to upgrade to ${PLANS[newPlan].name}.`, variant: 'destructive' });
      return;
    }
    const planConfig = PLANS[newPlan];
    setState(prev => ({
      ...prev, plan: newPlan,
      credits: planConfig.credits === -1 ? Infinity : planConfig.credits,
      upgradeDate: new Date().toISOString(),
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
    toast({ title: 'Plan Upgraded!', description: `You're now on the ${planConfig.name} plan.` });
  }, []);

  const addVerifiedCredits = useCallback((amount: number, paymentId?: string) => {
    setState(prev => ({ ...prev, purchasedCredits: prev.purchasedCredits + amount }));
    toast({ title: 'Credits Added!', description: `${amount} credits added.${paymentId ? ` (Payment: ${paymentId.slice(-8)})` : ''}` });
  }, []);

  const buyCredits = useCallback((amount: number, paymentVerified: boolean = false) => {
    if (!paymentVerified) {
      toast({ title: 'Payment Required', description: 'Please complete payment to purchase credits.', variant: 'destructive' });
      return;
    }
    addVerifiedCredits(amount);
  }, [addVerifiedCredits]);

  const isChartAvailable = useCallback((chartType: string): boolean => {
    return CHART_TYPES_BY_PLAN[state.plan].includes(chartType);
  }, [state.plan]);

  const getAvailableCharts = useCallback((): string[] => {
    return CHART_TYPES_BY_PLAN[state.plan];
  }, [state.plan]);

  const isFeatureAvailable = useCallback((feature: string): boolean => {
    return FEATURES_BY_PLAN[state.plan].includes(feature);
  }, [state.plan]);

  const canAddDataset = useCallback((currentCount: number): boolean => {
    if (currentPlan.maxDatasets === -1) return true;
    return currentCount < currentPlan.maxDatasets;
  }, [currentPlan]);

  const canIngestRows = useCallback((rowCount: number): { allowed: boolean; maxRows: number } => {
    if (currentPlan.maxRows === -1) return { allowed: true, maxRows: -1 };
    return { allowed: rowCount <= currentPlan.maxRows, maxRows: currentPlan.maxRows };
  }, [currentPlan]);

  const getCreditCost = useCallback((action: CreditAction): number => {
    return CREDIT_COSTS[action];
  }, []);

  const hasPersistentStorage = currentPlan.hasPersistentStorage;
  const maxStorageMB = currentPlan.maxStorageMB;

  const canUploadFile = useCallback((fileSizeMB: number): { allowed: boolean; reason?: string } => {
    if (currentPlan.maxStorageMB === -1) return { allowed: true };
    if (fileSizeMB > currentPlan.maxStorageMB) {
      return { allowed: false, reason: `File exceeds your ${currentPlan.maxStorageMB}MB storage limit. Upgrade to get more storage.` };
    }
    return { allowed: true };
  }, [currentPlan]);

  const isAIAvailable = useCallback((): boolean => {
    return currentPlan.aiModels.length > 0;
  }, [currentPlan]);

  const getUpgradeMessage = useCallback((feature: string): string => {
    const requiredPlan = getRequiredPlan(feature);
    return `Upgrade to ${PLANS[requiredPlan].name} to unlock this feature.`;
  }, [getRequiredPlan]);

  return {
    plan: state.plan, planConfig: currentPlan,
    credits: isEnterprise ? Infinity : totalCredits,
    isEnterprise, isFree,
    canPerformAction, consumeCredits, upgradePlan, buyCredits, addVerifiedCredits,
    isChartAvailable, getAvailableCharts, isFeatureAvailable,
    canAddDataset, canIngestRows, getCreditCost, isAIAvailable,
    getRequiredPlan, meetsPlanRequirement, getUpgradeMessage
  };
}
