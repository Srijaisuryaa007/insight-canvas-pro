import { useState } from 'react';
import { CreditPackage, CREDIT_PACKAGES, PaymentVerification } from '@/types/payment';
import { createCreditOrder, verifyPaymentAndAddCredits } from '@/lib/paymentApi';
import { useSubscription } from './useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { email: string; name: string };
  theme: { color: string };
  handler: (response: PaymentVerification) => void;
  modal?: { ondismiss: () => void };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

export function usePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<CreditPackage | null>(null);
  const { buyCredits } = useSubscription();
  const { user, addCredits } = useAuth();

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const initiatePayment = async (creditPackage: CreditPackage) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to purchase credits.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setCurrentPackage(creditPackage);

    try {
      // Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order on server
      const orderData = await createCreditOrder(user.id, creditPackage);

      // Open Razorpay checkout
      const options: RazorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'DataPulse',
        description: `Purchase ${creditPackage.credits} Credits`,
        prefill: {
          email: user.email,
          name: user.name,
        },
        theme: { color: '#6366f1' },
        handler: async (response: PaymentVerification) => {
          await handlePaymentSuccess(response, creditPackage);
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setCurrentPackage(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment initiation failed:', error);
      toast({
        title: 'Payment Failed',
        description: 'Could not initiate payment. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setCurrentPackage(null);
    }
  };

  const handlePaymentSuccess = async (
    verification: PaymentVerification,
    creditPackage: CreditPackage
  ) => {
    if (!user) return;

    try {
      // CRITICAL: Server-side verification before adding credits
      const result = await verifyPaymentAndAddCredits(user.id, verification);

      if (result.success) {
        // Update local state only after server confirms
        addCredits(result.credits);
        buyCredits(result.credits, true); // Mark as verified

        toast({
          title: 'Payment Successful!',
          description: `${result.credits} credits added. New balance: ${result.newBalance}`,
        });
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      toast({
        title: 'Verification Failed',
        description: 'Payment received but verification failed. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setCurrentPackage(null);
    }
  };

  return {
    isProcessing,
    currentPackage,
    creditPackages: CREDIT_PACKAGES,
    initiatePayment,
  };
}
