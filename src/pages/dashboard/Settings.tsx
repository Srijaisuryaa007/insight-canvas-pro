import { 
  Settings as SettingsIcon, User, CreditCard, Zap, Crown, CheckCircle, Sparkles, Loader2
} from 'lucide-react';
import { DataAlerts } from '@/components/dashboard/DataAlerts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useSubscription } from '@/hooks/useSubscription';
import { usePayment } from '@/hooks/usePayment';
import { useAuth } from '@/contexts/AuthContext';
import { PLANS, PlanType } from '@/types/subscription';
import { cn } from '@/lib/utils';

const planOrder: PlanType[] = ['free', 'basic', 'pro', 'enterprise'];

export default function Settings() {
  const { user } = useAuth();
  const { plan, credits, isEnterprise, upgradePlan } = useSubscription();
  const { isProcessing, currentPackage, currentPlanUpgrade, creditPackages, initiatePayment, initiateSubscriptionUpgrade } = usePayment();

  const planConfigs = planOrder.map(id => ({
    ...PLANS[id],
    popular: id === 'pro',
    icon: id === 'enterprise' ? Crown : id === 'pro' ? Sparkles : Zap,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-7 w-7" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account and subscription</p>
      </div>

      {/* Account */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5" />Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{user?.name || 'User'}</p></div>
            <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{user?.email || '-'}</p></div>
            <div><Label className="text-muted-foreground">Current Plan</Label><Badge className="mt-1 capitalize">{plan}</Badge></div>
            <div><Label className="text-muted-foreground">Credits</Label><p className="font-medium">{isEnterprise ? 'Unlimited' : credits}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />Subscription Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {planConfigs.map(p => {
            const isCurrent = plan === p.id;
            return (
              <Card key={p.id} className={cn("bg-card border-border relative",
                p.popular && "border-primary shadow-lg",
                isCurrent && "ring-2 ring-primary")}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {p.id === 'enterprise' && <Crown className="h-5 w-5 text-amber-500" />}
                    {p.name}
                  </CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{p.priceLabel}</span>
                  </div>
                  <CardDescription>{p.maxDatasets === -1 ? 'Unlimited datasets' : `${p.maxDatasets} dataset(s)`}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || (isProcessing && currentPlanUpgrade === p.id)}
                    onClick={() => p.id === 'free' ? upgradePlan('free') : initiateSubscriptionUpgrade(p.id)}>
                    {isProcessing && currentPlanUpgrade === p.id ? 'Processing...' : isCurrent ? 'Current Plan' : p.price === 0 ? 'Downgrade' : `Upgrade - ₹${(p.priceINR / 100).toFixed(0)}/mo`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Buy Credits with Razorpay */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5" />Buy Additional Credits
          </CardTitle>
          <CardDescription>
            Purchase credits securely via Razorpay. Credits are added instantly after payment verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {creditPackages.map(pkg => {
              const isLoading = isProcessing && currentPackage?.id === pkg.id;
              return (
                <Card 
                  key={pkg.id} 
                  className={cn(
                    "relative cursor-pointer transition-all hover:border-primary",
                    pkg.popular && "border-primary",
                    isLoading && "opacity-75"
                  )}
                  onClick={() => !isProcessing && initiatePayment(pkg)}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs">Best Value</Badge>
                  )}
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{pkg.credits}</p>
                    <p className="text-sm text-muted-foreground">Credits</p>
                    <p className="mt-2 font-semibold">₹{(pkg.priceINR / 100).toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">(${pkg.priceUSD})</p>
                    <Button 
                      className="mt-3 w-full" 
                      size="sm" 
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.stopPropagation();
                        initiatePayment(pkg);
                      }}
                    >
                      {isLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing</>
                      ) : (
                        'Buy Now'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Secured by Razorpay. Credits are only added after successful payment verification.
          </p>
        </CardContent>
      </Card>

      {/* Data Alerts */}
      <DataAlerts />
    </div>
  );
}
