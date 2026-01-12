import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/khmerzoon.png';
import { KHQRCodeImage } from './KHQRCodeImage';

interface KHQRPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
}

export const KHQRPaymentDialog = ({ isOpen, onClose, onSuccess }: KHQRPaymentDialogProps) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');

  // Check if user is logged in
  useEffect(() => {
    if (isOpen && !user) {
      toast.error('Please login to top up your wallet');
      onClose();
    }
  }, [isOpen, user, onClose]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (paymentStatus === 'pending' && transactionId) {
      interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentStatus, transactionId]);

  const generateQRCode = async () => {
    if (!user) {
      toast.error('Please login to continue');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please login again');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('khqr-payment', {
        body: {
          action: 'generate',
          amount: parseFloat(amount),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        setQrCode(data.qrCode);
        setTransactionId(data.transactionId);
        setExpiresAt(data.expiresAt);
        setPaymentStatus('pending');
        toast.success('QR Code generated! Scan to pay');
      } else {
        throw new Error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!transactionId || checking || !user) return;

    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session for payment check');
        setChecking(false);
        return;
      }

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
        console.error('Payment check error:', error);
        setChecking(false);
        return;
      }

      if (data.status === 'completed') {
        setPaymentStatus('completed');
        toast.success(`Payment successful! Balance: $${data.newBalance.toFixed(2)}`);
        onSuccess?.(data.newBalance);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else if (data.error) {
        console.warn('Bakong API issue:', data.error);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setChecking(false);
    }
  };

  const manualCheckPayment = async () => {
    if (!transactionId || !user) return;

    setChecking(true);
    toast.info('Checking payment status...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please login again');
        setChecking(false);
        return;
      }

      // Check directly in database for webhook updates
      const { data: transaction, error: txError } = await supabase
        .from('payment_transactions')
        .select('status, amount')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single();

      if (txError) {
        console.error('Error fetching transaction:', txError);
        toast.error('Failed to check payment status');
        setChecking(false);
        return;
      }

      if (transaction.status === 'completed') {
        // Get updated balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();

        const newBalance = profile?.wallet_balance || 0;
        
        setPaymentStatus('completed');
        toast.success(`Payment confirmed! Balance: $${newBalance.toFixed(2)}`);
        onSuccess?.(newBalance);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        toast.info('Payment not confirmed yet. Please wait or contact support if you have paid.');
      }
    } catch (error) {
      console.error('Error in manual check:', error);
      toast.error('Failed to verify payment');
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => {
    setAmount('10');
    setQrCode(null);
    setTransactionId(null);
    setExpiresAt(null);
    setPaymentStatus('idle');
    onClose();
  };

  const quickAmounts = [5, 10, 20, 50, 100];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-background via-background to-primary/5">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <img src={logo} alt="KHMERZOON" className="w-12 h-12 object-contain" />
            <div>
              <DialogTitle className="text-2xl font-bold">KHMERZOON</DialogTitle>
              <DialogDescription>Top Up Wallet using KHQR Payment</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {paymentStatus === 'idle' && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium">Enter Amount (USD)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  className="text-lg h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Quick Select</label>
                <div className="grid grid-cols-5 gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      variant={amount === quickAmount.toString() ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAmount(quickAmount.toString())}
                      className="font-semibold"
                    >
                      ${quickAmount}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateQRCode}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating QR Code...
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5 mr-2" />
                    Generate KHQR Payment
                  </>
                )}
              </Button>
            </>
          )}

          {paymentStatus === 'pending' && qrCode && (
            <div className="space-y-4">
              <KHQRCodeImage
                qrCode={qrCode}
                amount={parseFloat(amount)}
                checking={checking}
                onCheckPayment={manualCheckPayment}
              />

              {expiresAt && (
                <p className="text-xs text-center text-muted-foreground">
                  Expires at {new Date(expiresAt).toLocaleTimeString()}
                </p>
              )}

              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          {paymentStatus === 'completed' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="p-4 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-bold text-green-500">Payment Successful!</h3>
                <p className="text-muted-foreground">
                  ${parseFloat(amount).toFixed(2)} has been added to your wallet
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
