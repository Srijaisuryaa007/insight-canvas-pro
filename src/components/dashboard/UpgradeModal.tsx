import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Sparkles, Zap } from 'lucide-react';
import { PLANS, PlanType } from '@/types/subscription';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { upgradePlan, buyCredits, plan: currentPlan } = useSubscription();

  const handleUpgrade = (plan: PlanType) => {
    upgradePlan(plan);
    onOpenChange(false);
  };

  const handleBuyCredits = (amount: number) => {
    buyCredits(amount);
    onOpenChange(false);
  };

  const planOrder: PlanType[] = ['basic', 'pro', 'enterprise'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            Get more datasets, charts, and credits to supercharge your analytics.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {planOrder.map((planId) => {
            const plan = PLANS[planId];
            const isCurrent = currentPlan === planId;
            const isPopular = planId === 'pro';

            return (
              <Card 
                key={planId} 
                className={`relative ${isPopular ? 'border-primary shadow-lg' : 'border-border'}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    {planId === 'enterprise' && <Crown className="h-5 w-5 text-amber-500" />}
                    {planId === 'pro' && <Sparkles className="h-5 w-5 text-violet-500" />}
                    {planId === 'basic' && <Zap className="h-5 w-5 text-blue-500" />}
                    {plan.name}
                  </CardTitle>
                  <div className="text-2xl font-bold">{plan.priceLabel}</div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent}
                    onClick={() => handleUpgrade(planId)}
                  >
                    {isCurrent ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <h4 className="font-semibold mb-4">Or Buy Additional Credits</h4>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => handleBuyCredits(50)}>
              50 Credits - $2
            </Button>
            <Button variant="outline" onClick={() => handleBuyCredits(200)}>
              200 Credits - $7
            </Button>
            <Button variant="outline" onClick={() => handleBuyCredits(500)}>
              500 Credits - $15
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
