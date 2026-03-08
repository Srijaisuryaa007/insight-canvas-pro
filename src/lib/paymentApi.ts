// Payment API - Razorpay Integration
// Credits are ONLY added after server-side payment verification

import { CreditPackage, PaymentVerification } from '@/types/payment';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Create a payment order for credit purchase
 * Server creates Razorpay order and stores pending transaction
 */
export async function createCreditOrder(
  userId: string,
  creditPackage: CreditPackage
): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> {
  const response = await fetch(`${API_BASE}/api/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      packageId: creditPackage.id,
      credits: creditPackage.credits,
      amount: creditPackage.priceINR, // Amount in paise
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create payment order');
  }

  return response.json();
}

/**
 * Verify payment and add credits to user account
 * This is the ONLY way credits get added - after server verification
 */
export async function verifyPaymentAndAddCredits(
  userId: string,
  verification: PaymentVerification
): Promise<{ success: boolean; credits: number; newBalance: number }> {
  const response = await fetch(`${API_BASE}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      ...verification,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Payment verification failed');
  }

  return response.json();
}

/**
 * Get user's payment history
 */
export async function getPaymentHistory(userId: string): Promise<{
  payments: Array<{
    id: string;
    orderId: string;
    credits: number;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}> {
  const response = await fetch(`${API_BASE}/api/payments/history/${userId}`);
  
  if (!response.ok) {
    return { payments: [] };
  }

  return response.json();
}

/**
 * Sync user credits from server (source of truth)
 */
export async function syncUserCredits(userId: string): Promise<{ credits: number }> {
  const response = await fetch(`${API_BASE}/api/credits/${userId}`);
  
  if (!response.ok) {
    throw new Error('Failed to sync credits');
  }

  return response.json();
}
