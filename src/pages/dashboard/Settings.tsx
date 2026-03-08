import { useState } from 'react';
import { 
  Settings as SettingsIcon, User, CreditCard, Zap, Crown, CheckCircle, Sparkles, Loader2, Globe, Link2, FileText, List, Image, TableIcon
} from 'lucide-react';
import { DataAlerts } from '@/components/dashboard/DataAlerts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSubscription } from '@/hooks/useSubscription';
import { usePayment } from '@/hooks/usePayment';
import { useAuth } from '@/contexts/AuthContext';
import { PLANS, PlanType } from '@/types/subscription';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const planOrder: PlanType[] = ['free', 'basic', 'pro', 'enterprise'];

// Web Scraping Component
function WebScrapingSection() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('text');

  const handleScrape = async () => {
    if (!url.trim()) {
      toast({ title: 'URL Required', description: 'Enter a URL to scrape', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `HTTP ${response.status}`);
        toast({ title: 'Scrape Failed', description: data.error || 'Could not scrape the URL', variant: 'destructive' });
      } else {
        setResult(data);
        toast({ title: 'Scraped Successfully', description: `${data.textLength?.toLocaleString()} characters extracted from ${data.title || data.url}` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend';
      setError(msg);
      toast({ title: 'Connection Error', description: 'Make sure the backend server is running on port 3001', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-5 w-5" />Web Scraping Tool
        </CardTitle>
        <CardDescription>
          Extract text, links, headings, images, and tables from any public website. Data is scraped via the backend server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
          />
          <Button onClick={handleScrape} disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Scraping...</>
            ) : (
              <><Globe className="h-4 w-4 mr-2" />Scrape</>
            )}
          </Button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {/* Meta info */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">{result.title || 'No title'}</h4>
                <Badge variant="secondary" className="text-[10px]">{result.textLength?.toLocaleString()} chars</Badge>
              </div>
              {result.description && <p className="text-xs text-muted-foreground">{result.description}</p>}
              <p className="text-[10px] text-muted-foreground truncate">{result.url}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">{result.links?.length || 0} links</Badge>
                <Badge variant="outline" className="text-[10px]">{result.headings?.length || 0} headings</Badge>
                <Badge variant="outline" className="text-[10px]">{result.images?.length || 0} images</Badge>
                <Badge variant="outline" className="text-[10px]">{result.tables?.length || 0} tables</Badge>
              </div>
            </div>

            {/* Tabs for different data */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8">
                <TabsTrigger value="text" className="text-xs gap-1 h-7"><FileText className="h-3 w-3" />Text</TabsTrigger>
                <TabsTrigger value="headings" className="text-xs gap-1 h-7"><List className="h-3 w-3" />Headings</TabsTrigger>
                <TabsTrigger value="links" className="text-xs gap-1 h-7"><Link2 className="h-3 w-3" />Links</TabsTrigger>
                <TabsTrigger value="images" className="text-xs gap-1 h-7"><Image className="h-3 w-3" />Images</TabsTrigger>
                <TabsTrigger value="tables" className="text-xs gap-1 h-7"><TableIcon className="h-3 w-3" />Tables</TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <ScrollArea className="h-[300px] rounded-lg border border-border p-3">
                  <pre className="text-xs whitespace-pre-wrap text-foreground font-sans leading-relaxed">
                    {result.textContent?.substring(0, 10000) || 'No text content extracted.'}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="headings">
                <ScrollArea className="h-[300px] rounded-lg border border-border p-3">
                  <div className="space-y-1">
                    {result.headings?.length > 0 ? result.headings.map((h: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm" style={{ paddingLeft: `${(h.level - 1) * 16}px` }}>
                        <Badge variant="outline" className="text-[9px] h-4 w-6 justify-center shrink-0">H{h.level}</Badge>
                        <span className={cn("text-xs", h.level <= 2 ? "font-semibold" : "text-muted-foreground")}>{h.text}</span>
                      </div>
                    )) : <p className="text-xs text-muted-foreground">No headings found.</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="links">
                <ScrollArea className="h-[300px] rounded-lg border border-border p-3">
                  <div className="space-y-1.5">
                    {result.links?.length > 0 ? result.links.map((l: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <Link2 className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{l.text}</p>
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-primary/70 truncate block hover:underline">{l.url}</a>
                        </div>
                      </div>
                    )) : <p className="text-xs text-muted-foreground">No links found.</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="images">
                <ScrollArea className="h-[300px] rounded-lg border border-border p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {result.images?.length > 0 ? result.images.map((img: any, i: number) => (
                      <div key={i} className="rounded-lg border border-border overflow-hidden bg-muted/30">
                        <img src={img.src} alt={img.alt} className="w-full h-24 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        <p className="text-[10px] text-muted-foreground p-1.5 truncate">{img.alt || img.src}</p>
                      </div>
                    )) : <p className="text-xs text-muted-foreground col-span-2">No images found.</p>}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="tables">
                <ScrollArea className="h-[300px] rounded-lg border border-border p-3">
                  {result.tables?.length > 0 ? result.tables.map((table: string[][], ti: number) => (
                    <div key={ti} className="mb-4">
                      <p className="text-xs font-medium mb-1">Table {ti + 1}</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-border">
                          <tbody>
                            {table.slice(0, 20).map((row, ri) => (
                              <tr key={ri} className={ri === 0 ? 'bg-muted font-medium' : ''}>
                                {row.map((cell, ci) => (
                                  <td key={ci} className="border border-border px-2 py-1">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )) : <p className="text-xs text-muted-foreground">No tables found.</p>}
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Copy buttons */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                navigator.clipboard.writeText(result.textContent || '');
                toast({ title: 'Copied', description: 'Text content copied to clipboard' });
              }}>Copy Text</Button>
              <Button size="sm" variant="outline" onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                toast({ title: 'Copied', description: 'Full JSON result copied to clipboard' });
              }}>Copy JSON</Button>
              <Button size="sm" variant="outline" onClick={() => {
                const linksText = result.links?.map((l: any) => `${l.text}: ${l.url}`).join('\n') || '';
                navigator.clipboard.writeText(linksText);
                toast({ title: 'Copied', description: `${result.links?.length || 0} links copied` });
              }}>Copy Links</Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Scraping runs through the backend server (port 3001). Only public pages can be scraped. Respects robots.txt and rate limits.
        </p>
      </CardContent>
    </Card>
  );
}

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

      {/* Web Scraping Tool */}
      <WebScrapingSection />

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
