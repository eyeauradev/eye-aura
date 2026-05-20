declare module "*.css";

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  modal?: {
    ondismiss?: () => void;
    animation?: boolean;
  };
  theme?: {
    color?: string;
  };
}

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (response: any) => void): void;
}

interface Window {
  Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
}
