import { useState } from 'react';
import { CreditPackage, CREDIT_PACKAGES, PaymentVerification } from '@/types/payment';
import { PlanType, PLANS } from '@/types/subscription';
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function usePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<CreditPackage | null>(null);
  const [currentPlanUpgrade, setCurrentPlanUpgrade] = useState<PlanType | null>(null);
  const { buyCredits, upgradePlan, addVerifiedCredits } = useSubscription();
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

  // Purchase credits
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
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Failed to load payment gateway');
      }

      const orderData = await createCreditOrder(user.id, creditPackage);

      const options: RazorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'DataPulse',
        description: `Purchase ${creditPackage.credits} Credits`,
        prefill: { email: user.email, name: user.name },
        theme: { color: '#6366f1' },
        handler: async (response: PaymentVerification) => {
          await handleCreditPaymentSuccess(response, creditPackage);
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

  // Upgrade subscription
  const initiateSubscriptionUpgrade = async (planId: PlanType) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to upgrade your plan.',
        variant: 'destructive',
      });
      return;
    }

    if (planId === 'free') {
      upgradePlan('free', true); // Downgrade is free
      return;
    }

    const planConfig = PLANS[planId];
    setIsProcessing(true);
    setCurrentPlanUpgrade(planId);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create subscription order
      const response = await fetch(`${API_BASE}/api/payments/create-subscription-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          planId,
          amount: planConfig.priceINR,
        }),
      });

      if (!response.ok) throw new Error('Failed to create order');
      const orderData = await response.json();

      const options: RazorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: 'INR',
        order_id: orderData.orderId,
        name: 'DataPulse',
        description: `${planConfig.name} Plan - Monthly Subscription`,
        prefill: { email: user.email, name: user.name },
        theme: { color: '#6366f1' },
        handler: async (response: PaymentVerification) => {
          await handleSubscriptionPaymentSuccess(response, planId);
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setCurrentPlanUpgrade(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Subscription payment failed:', error);
      toast({
        title: 'Payment Failed',
        description: 'Could not initiate subscription payment.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setCurrentPlanUpgrade(null);
    }
  };

  const handleCreditPaymentSuccess = async (
    verification: PaymentVerification,
    creditPackage: CreditPackage
  ) => {
    if (!user) return;

    try {
      const result = await verifyPaymentAndAddCredits(user.id, verification);

      if (result.success) {
        addCredits(result.credits);
        addVerifiedCredits(result.credits, verification.razorpay_payment_id);

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

  const handleSubscriptionPaymentSuccess = async (
    verification: PaymentVerification,
    planId: PlanType
  ) => {
    if (!user) return;

    try {
      const response = await fetch(`${API_BASE}/api/payments/verify-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          planId,
          ...verification,
        }),
      });

      if (!response.ok) throw new Error('Verification failed');
      const result = await response.json();

      if (result.success) {
        upgradePlan(planId, true); // Verified payment

        toast({
          title: 'Subscription Activated!',
          description: `You're now on the ${PLANS[planId].name} plan with ${PLANS[planId].credits === -1 ? 'unlimited' : PLANS[planId].credits} credits.`,
        });
      }
    } catch (error) {
      console.error('Subscription verification failed:', error);
      toast({
        title: 'Verification Failed',
        description: 'Payment received but activation failed. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setCurrentPlanUpgrade(null);
    }
  };

  return {
    isProcessing,
    currentPackage,
    currentPlanUpgrade,
    creditPackages: CREDIT_PACKAGES,
    initiatePayment,
    initiateSubscriptionUpgrade,
  };
}
