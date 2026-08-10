// Web has no react-native-webview implementation, so on web we skip the
// WebView-based flow entirely and load Razorpay's own Checkout.js directly --
// the standard way to integrate Razorpay in a plain browser context.

export type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
};

type RazorpayConstructor = new (options: {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill: { name: string; email: string; contact: string };
  theme?: { color: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

/** Thrown when the user closes the Razorpay modal without paying -- not a failure. */
export class RazorpayDismissedError extends Error {
  constructor() {
    super('Payment was cancelled.');
    this.name = 'RazorpayDismissedError';
  }
}

const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SCRIPT_URL;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Could not load Razorpay checkout. Please check your connection and try again.'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export async function openRazorpayWebCheckout(options: {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  name: string;
  email: string;
  contact: string;
}): Promise<RazorpaySuccessResponse> {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error('Could not load Razorpay checkout. Please try again.');

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: options.keyId,
      amount: options.amount,
      currency: options.currency,
      order_id: options.orderId,
      name: 'Happy Shopping',
      description: 'Order payment',
      prefill: { name: options.name, email: options.email, contact: options.contact },
      theme: { color: '#3c87f7' },
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new RazorpayDismissedError()),
      },
    });
    rzp.on('payment.failed', (response) => {
      reject(new Error(response.error?.description ?? 'Payment failed. Please try again.'));
    });
    rzp.open();
  });
}
