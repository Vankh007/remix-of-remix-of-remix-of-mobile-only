import { useState, useEffect } from 'react';
import { Crown, Check, Sparkles, Zap, Wallet, CreditCard, ArrowRight, ArrowLeft, X, Loader2, QrCode, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import QRCode from 'react-qr-code';
import { AuthDialog } from './AuthDialog';

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: number;
  duration_unit: string;
  device_limit: number;
  show_ads: boolean;
  is_active: boolean;
}

type ViewState = 'auth' | 'plans' | 'confirm' | 'topup' | 'qr' | 'success';

interface MobileVIPPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileVIPPanel({ open, onOpenChange }: MobileVIPPanelProps) {
  const [view, setView] = useState<ViewState>('plans');
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [processingPurchase, setProcessingPurchase] = useState(false);
  const [currentMembership, setCurrentMembership] = useState<any>(null);
  
  // Top-up state
  const [topupAmount, setTopupAmount] = useState('10');
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Reset state when panel opens
  useEffect(() => {
    if (open) {
      if (!user) {
        setView('auth');
      } else {
        setView('plans');
        fetchPlans();
        fetchWalletBalance();
        checkCurrentMembership();
      }
    } else {
      // Reset everything when closed
      setSelectedPlan(null);
      setQrCode(null);
      setTransactionId(null);
      setTopupAmount('10');
    }
  }, [open, user]);

  // Check payment status periodically when QR is shown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (view === 'qr' && transactionId) {
      interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [view, transactionId]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setWalletBalance(data?.wallet_balance || 0);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const checkCurrentMembership = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentMembership(data);
    } catch (error) {
      console.error('Error checking membership:', error);
    }
  };

  const handleSelectPlan = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    
    // Calculate required amount for top-up
    const needed = plan.price - walletBalance;
    if (needed > 0) {
      setTopupAmount(Math.ceil(needed).toString());
    }
    
    setView('confirm');
  };

  const handleAuthSuccess = () => {
    setView('plans');
    fetchPlans();
    fetchWalletBalance();
    checkCurrentMembership();
  };

  const handleTopUp = () => {
    if (selectedPlan) {
      const needed = selectedPlan.price - walletBalance;
      setTopupAmount(Math.max(needed, 5).toFixed(0));
    }
    setView('topup');
  };

  const generateQRCode = async () => {
    if (!user) return;

    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    setGeneratingQR(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({ title: 'Error', description: 'Session expired. Please login again', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('khqr-payment', {
        body: {
          action: 'generate',
          amount,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        setQrCode(data.qrCode);
        setTransactionId(data.transactionId);
        setView('qr');
        toast({ title: 'Success', description: 'QR Code generated! Scan to pay' });
      } else {
        throw new Error(data.error || 'Failed to generate QR code');
      }
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      toast({ title: 'Error', description: error.message || 'Failed to generate QR code', variant: 'destructive' });
    } finally {
      setGeneratingQR(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!transactionId || checkingPayment || !user) return;

    setCheckingPayment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('khqr-payment', {
        body: {
          action: 'check',
          transactionId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        setCheckingPayment(false);
        return;
      }

      if (data.status === 'completed') {
        setWalletBalance(data.newBalance);
        toast({ title: 'Success', description: `Payment successful! Balance: $${data.newBalance.toFixed(2)}` });
        
        // Go back to confirm view with updated balance
        setQrCode(null);
        setTransactionId(null);
        setView('confirm');
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setCheckingPayment(false);
    }
  };

  const manualCheckPayment = async () => {
    if (!transactionId || !user) return;

    setCheckingPayment(true);
    
    try {
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('status, amount')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single();

      if (transaction?.status === 'completed') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();

        const newBalance = profile?.wallet_balance || 0;
        setWalletBalance(newBalance);
        
        toast({ title: 'Success', description: `Payment confirmed! Balance: $${newBalance.toFixed(2)}` });
        
        setQrCode(null);
        setTransactionId(null);
        setView('confirm');
      } else {
        toast({ title: 'Info', description: 'Payment not confirmed yet. Please wait.' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to verify payment', variant: 'destructive' });
    } finally {
      setCheckingPayment(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPlan || !user) return;

    if (walletBalance < selectedPlan.price) {
      toast({
        title: 'Insufficient Balance',
        description: `You need $${(selectedPlan.price - walletBalance).toFixed(2)} more`,
        variant: 'destructive'
      });
      return;
    }

    setProcessingPurchase(true);

    try {
      const { error } = await supabase.rpc('purchase_membership_with_wallet', {
        p_user_id: user.id,
        p_plan_id: selectedPlan.id,
        p_amount: selectedPlan.price
      });

      if (error) throw error;

      setView('success');
      fetchWalletBalance();
      checkCurrentMembership();
      
      toast({
        title: 'Subscription Successful!',
        description: `You are now subscribed to ${selectedPlan.name}`,
      });

      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error subscribing:', error);
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setProcessingPurchase(false);
    }
  };

  const getPlanIcon = (index: number) => {
    const icons = [Sparkles, Zap, Crown];
    return icons[index % icons.length];
  };

  const quickAmounts = [5, 10, 20, 50];

  if (!open) return null;

  // Auth view - show login dialog
  if (view === 'auth') {
    return (
      <AuthDialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onOpenChange(false);
        }}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-hidden">
      <div className="h-full w-full flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-3 bg-black/80 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center gap-2">
            {(view === 'confirm' || view === 'topup' || view === 'qr') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white"
                onClick={() => {
                  if (view === 'qr') setView('topup');
                  else if (view === 'topup') setView('confirm');
                  else setView('plans');
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Crown className="h-5 w-5 text-yellow-400" />
            <span className="font-semibold text-white">
              {view === 'plans' && 'VIP Membership'}
              {view === 'confirm' && 'Confirm Purchase'}
              {view === 'topup' && 'Top Up Wallet'}
              {view === 'qr' && 'Scan to Pay'}
              {view === 'success' && 'Success!'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 overflow-y-auto">
          {/* Plans View */}
          {view === 'plans' && (
            <div className="space-y-4">
              {/* Wallet Balance */}
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-white">Wallet Balance</span>
                </div>
                <span className="font-bold text-lg text-white">${walletBalance.toFixed(2)}</span>
              </div>

              {/* Current Membership */}
              {currentMembership && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary/40 text-xs">
                    Active
                  </Badge>
                  <span className="text-sm text-white">
                    {currentMembership.membership_type}
                  </span>
                </div>
              )}

              {/* Plans Grid - responsive for landscape */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-2 landscape:grid-cols-4 gap-2">
                  {plans.map((plan, index) => {
                    const Icon = getPlanIcon(index);
                    const isPopular = index === 1;
                    const isCurrentPlan = currentMembership?.membership_type === plan.name;
                    
                    return (
                      <Card 
                        key={plan.id}
                        className={`relative bg-white/5 border-white/10 ${
                          isPopular ? 'border-primary' : ''
                        }`}
                      >
                        {isPopular && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-semibold rounded-full">
                            Popular
                          </div>
                        )}

                        <CardHeader className="p-3 pb-2">
                          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 w-8 h-8 mb-2">
                            <Icon className="text-primary h-4 w-4" />
                          </div>
                          
                          <CardTitle className="text-sm text-white">{plan.name}</CardTitle>
                          
                          <div className="mt-1">
                            <div className="flex items-baseline">
                              <span className="text-xl font-bold text-white">
                                ${plan.price}
                              </span>
                            </div>
                            <p className="text-[10px] text-white/50">
                              {plan.duration} {plan.duration_unit}
                            </p>
                          </div>
                        </CardHeader>

                        <CardContent className="p-3 pt-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Check className="text-primary h-3 w-3 flex-shrink-0" />
                            <span className="text-[10px] text-white/70">HD & 4K</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="text-primary h-3 w-3 flex-shrink-0" />
                            <span className="text-[10px] text-white/70">{plan.device_limit} devices</span>
                          </div>
                          {!plan.show_ads && (
                            <div className="flex items-center gap-1.5">
                              <Check className="text-primary h-3 w-3 flex-shrink-0" />
                              <span className="text-[10px] text-white/70">No ads</span>
                            </div>
                          )}
                        </CardContent>

                        <CardFooter className="p-3 pt-0">
                          <Button
                            className="w-full h-8 text-xs"
                            variant={isPopular ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleSelectPlan(plan)}
                            disabled={isCurrentPlan}
                          >
                            {isCurrentPlan ? 'Active' : 'Select'}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Confirm View */}
          {view === 'confirm' && selectedPlan && (
            <div className="space-y-4 max-w-md mx-auto">
              {/* Plan Info */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Crown className="h-6 w-6 text-yellow-400" />
                  <div>
                    <p className="font-semibold text-white">{selectedPlan.name}</p>
                    <p className="text-xs text-white/50">{selectedPlan.duration} {selectedPlan.duration_unit}</p>
                  </div>
                </div>
              </div>

              {/* Wallet Balance */}
              <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-white">Wallet Balance</span>
                </div>
                <span className="font-bold text-lg text-white">${walletBalance.toFixed(2)}</span>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-white/50" />
                  <span className="text-sm font-medium text-white">Price</span>
                </div>
                <span className="font-bold text-lg text-red-400">
                  ${selectedPlan.price.toFixed(2)}
                </span>
              </div>

              {/* Insufficient balance or purchase */}
              {walletBalance < selectedPlan.price ? (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-400 mb-2">
                    Insufficient Balance
                  </p>
                  <p className="text-xs text-red-400/70 mb-3">
                    You need ${(selectedPlan.price - walletBalance).toFixed(2)} more
                  </p>
                  <Button 
                    onClick={handleTopUp}
                    className="w-full"
                    size="sm"
                  >
                    Top Up Wallet
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                    <p className="text-xs text-white/50">Remaining after purchase</p>
                    <p className="text-sm font-semibold text-white">
                      ${(walletBalance - selectedPlan.price).toFixed(2)}
                    </p>
                  </div>
                  
                  <Button
                    onClick={handlePurchase}
                    disabled={processingPurchase}
                    className="w-full h-12"
                  >
                    {processingPurchase ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Purchase for $${selectedPlan.price.toFixed(2)}`
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Top-up View */}
          {view === 'topup' && (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">Enter Amount (USD)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  className="text-lg h-12 bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/50">Quick Select</label>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((amt) => (
                    <Button
                      key={amt}
                      variant={topupAmount === amt.toString() ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTopupAmount(amt.toString())}
                      className="font-semibold"
                    >
                      ${amt}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateQRCode}
                disabled={generatingQR || !topupAmount || parseFloat(topupAmount) <= 0}
                className="w-full h-12"
              >
                {generatingQR ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5 mr-2" />
                    Generate KHQR (${parseFloat(topupAmount || '0').toFixed(2)})
                  </>
                )}
              </Button>
            </div>
          )}

          {/* QR View */}
          {view === 'qr' && qrCode && (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="bg-white rounded-xl p-4 flex justify-center">
                <QRCode id="mobile-vip-qr" value={qrCode} size={200} />
              </div>

              <div className="text-center space-y-1">
                <p className="text-lg font-semibold text-white">Scan to Pay ${parseFloat(topupAmount).toFixed(2)}</p>
                <p className="text-sm text-white/50">Use any Cambodian banking app</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-white/50 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting for payment...
              </div>

              <Button
                variant="outline"
                onClick={manualCheckPayment}
                disabled={checkingPayment}
                className="w-full"
              >
                {checkingPayment ? 'Checking...' : 'I have paid'}
              </Button>
            </div>
          )}

          {/* Success View */}
          {view === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <CheckCircle2 className="w-20 h-20 text-green-500" />
              <p className="text-xl font-semibold text-white">Purchase Successful!</p>
              <p className="text-sm text-white/50">Welcome to VIP membership</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
