import { useAuth } from '@/contexts/AuthContext';
import { CREDIT_COSTS } from '@/types';
import { toast } from '@/hooks/use-toast';

export function useCredits() {
  const { user, deductCredits } = useAuth();

  const checkCredits = (action: keyof typeof CREDIT_COSTS): boolean => {
    if (!user) return false;
    if (user.plan === 'enterprise') return true;
    
    const cost = CREDIT_COSTS[action];
    return user.credits >= cost;
  };

  const consumeCredits = (action: keyof typeof CREDIT_COSTS): boolean => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to perform this action.',
        variant: 'destructive',
      });
      return false;
    }

    const cost = CREDIT_COSTS[action];
    
    if (user.plan === 'enterprise') {
      return true;
    }

    if (user.credits < cost) {
      toast({
        title: 'Insufficient Credits',
        description: `This action requires ${cost} credits. You have ${user.credits} credits remaining.`,
        variant: 'destructive',
      });
      return false;
    }

    const success = deductCredits(cost);
    if (success) {
      toast({
        title: 'Credits Used',
        description: `${cost} credits consumed. ${user.credits - cost} remaining.`,
      });
    }
    return success;
  };

  const getCreditCost = (action: keyof typeof CREDIT_COSTS): number => {
    return CREDIT_COSTS[action];
  };

  return {
    credits: user?.credits ?? 0,
    plan: user?.plan ?? 'free',
    checkCredits,
    consumeCredits,
    getCreditCost,
    isUnlimited: user?.plan === 'enterprise',
  };
}
