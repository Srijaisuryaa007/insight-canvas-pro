// Payment & Credit Purchase Types

export interface CreditPackage {
  id: string;
  credits: number;
  priceINR: number; // Price in INR (paise for Razorpay)
  priceUSD: number;
  label: string;
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'pack-50', credits: 50, priceINR: 16600, priceUSD: 2, label: '50 Credits' },
  { id: 'pack-200', credits: 200, priceINR: 58100, priceUSD: 7, label: '200 Credits', popular: true },
  { id: 'pack-500', credits: 500, priceINR: 124500, priceUSD: 15, label: '500 Credits' },
  { id: 'pack-1000', credits: 1000, priceINR: 207500, priceUSD: 25, label: '1000 Credits' },
];

export interface PaymentOrder {
  orderId: string;
  packageId: string;
  credits: number;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  userId: string;
  createdAt: string;
}

export interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
