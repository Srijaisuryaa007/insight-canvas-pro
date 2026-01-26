import { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  CreditCard, 
  Zap,
  Crown,
  CheckCircle,
  Sparkles,
  Map,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionPlan, AddonType, PLAN_LIMITS } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const plans = [
  {
    id: 'free' as SubscriptionPlan,
    name: 'Free',
    price: '$0',
    description: 'For individuals getting started',
    features: [
      'Bar & Line charts',
      '1 dataset',
      '100 credits/month',
      'Basic quality scan',
    ],
  },
  {
    id: 'pro' as SubscriptionPlan,
    name: 'Pro',
    price: '$29',
    description: 'For professionals and small teams',
    popular: true,
    features: [
      'All basic charts + Area, Scatter, Pie, Heatmap',
      'Unlimited datasets',
      '1,000 credits/month',
      'Advanced quality scan',
      'PDF export',
      'Forecast addon included',
    ],
  },
  {
    id: 'enterprise' as SubscriptionPlan,
    name: 'Enterprise',
    price: '$99',
    description: 'For large organizations',
    features: [
      'All chart types including Geo Maps',
      'Unlimited datasets',
      'Unlimited credits',
      'Anomaly detection',
      'RAG-powered Copilot',
      'Team sharing & collaboration',
      'Priority support',
    ],
  },
];

const addons = [
  {
    id: 'forecast' as AddonType,
    name: 'Forecast Pack',
    price: '$9/mo',
    description: 'Time series forecasting and predictions',
    icon: TrendingUp,
  },
  {
    id: 'anomaly' as AddonType,
    name: 'Anomaly Detection',
    price: '$14/mo',
    description: 'Automatic outlier and anomaly detection',
    icon: AlertTriangle,
  },
  {
    id: 'geo-maps' as AddonType,
    name: 'Geo Maps',
    price: '$19/mo',
    description: 'Geographic visualizations and mapping',
    icon: Map,
  },
];

export default function Settings() {
  const { user, updatePlan, addAddon, addCredits } = useAuth();

  const handleUpgrade = (plan: SubscriptionPlan) => {
    updatePlan(plan);
    toast({
      title: 'Plan Updated!',
      description: `You're now on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`,
    });
  };

  const handleAddAddon = (addonId: AddonType) => {
    if (user?.addons.includes(addonId)) {
      toast({
        title: 'Already Owned',
        description: 'You already have this addon.',
      });
      return;
    }
    addAddon(addonId);
    toast({
      title: 'Addon Added!',
      description: `${addons.find(a => a.id === addonId)?.name} has been added to your account.`,
    });
  };

  const handleBuyCredits = (amount: number) => {
    addCredits(amount);
    toast({
      title: 'Credits Added!',
      description: `${amount} credits have been added to your account.`,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-7 w-7" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and subscription
        </p>
      </div>

      {/* Account Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Current Plan</Label>
              <Badge className="mt-1 capitalize">{user?.plan}</Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Credits</Label>
              <p className="font-medium">
                {user?.plan === 'enterprise' ? 'Unlimited' : user?.credits}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscription Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <Card 
              key={plan.id}
              className={cn(
                "bg-card border-border relative",
                plan.popular && "border-primary shadow-lg",
                user?.plan === plan.id && "ring-2 ring-primary"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {plan.id === 'enterprise' && <Crown className="h-5 w-5 text-amber-500" />}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.price !== '$0' && <span className="text-muted-foreground">/month</span>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full"
                  variant={user?.plan === plan.id ? 'outline' : 'default'}
                  disabled={user?.plan === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {user?.plan === plan.id ? 'Current Plan' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Addons */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Add-on Packs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {addons.map(addon => {
            const owned = user?.addons.includes(addon.id);
            return (
              <Card key={addon.id} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <addon.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{addon.name}</CardTitle>
                      <span className="text-sm font-medium text-primary">{addon.price}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{addon.description}</p>
                  <Button 
                    variant={owned ? 'outline' : 'default'}
                    className="w-full"
                    disabled={owned}
                    onClick={() => handleAddAddon(addon.id)}
                  >
                    {owned ? 'Owned' : 'Add to Plan'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Buy Credits */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Buy Additional Credits
          </CardTitle>
          <CardDescription>Need more credits? Purchase them here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => handleBuyCredits(100)}>
              100 Credits - $5
            </Button>
            <Button variant="outline" onClick={() => handleBuyCredits(500)}>
              500 Credits - $20
            </Button>
            <Button variant="outline" onClick={() => handleBuyCredits(1000)}>
              1000 Credits - $35
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
