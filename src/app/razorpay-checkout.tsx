import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { useTheme } from '@/hooks/use-theme';
import { placeOrder, type ShippingAddress } from '@/lib/orders-api';

type RazorpayMessage =
  | { type: 'success'; payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string } }
  | { type: 'failed'; payload: { description?: string } }
  | { type: 'dismissed'; payload: Record<string, never> };

function buildCheckoutHtml(options: {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  name: string;
  email: string;
  contact: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function post(type, payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || {} }));
  }
  var options = {
    key: ${JSON.stringify(options.keyId)},
    amount: ${JSON.stringify(options.amount)},
    currency: ${JSON.stringify(options.currency)},
    order_id: ${JSON.stringify(options.orderId)},
    name: "Happy Baby",
    description: "Order payment",
    prefill: {
      name: ${JSON.stringify(options.name)},
      email: ${JSON.stringify(options.email)},
      contact: ${JSON.stringify(options.contact)}
    },
    theme: { color: "#3c87f7" },
    handler: function (response) {
      post('success', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });
    },
    modal: {
      ondismiss: function () { post('dismissed'); }
    }
  };
  var rzp = new Razorpay(options);
  rzp.on('payment.failed', function (response) {
    post('failed', { description: response.error && response.error.description });
  });
  rzp.open();
</script>
</body>
</html>`;
}

export default function RazorpayCheckoutScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { token } = useAuth();
  const { clearCart } = useCart();
  const params = useLocalSearchParams<{
    keyId: string;
    amount: string;
    currency: string;
    orderId: string;
    name: string;
    email: string;
    contact: string;
    items: string;
    shippingAddress: string;
  }>();

  const [isFinishingUp, setIsFinishingUp] = useState(false);
  const settledRef = useRef(false);

  const html = buildCheckoutHtml({
    keyId: params.keyId,
    amount: Number(params.amount),
    currency: params.currency,
    orderId: params.orderId,
    name: params.name,
    email: params.email,
    contact: params.contact,
  });

  async function handleMessage(event: WebViewMessageEvent) {
    if (settledRef.current) return;

    let message: RazorpayMessage;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (message.type === 'success') {
      settledRef.current = true;
      setIsFinishingUp(true);
      try {
        if (!token) throw new Error('You have been logged out. Please log in and try again.');
        const items: { productId: number; quantity: number }[] = JSON.parse(decodeURIComponent(params.items));
        const shippingAddress: ShippingAddress = JSON.parse(decodeURIComponent(params.shippingAddress));
        const order = await placeOrder(token, {
          razorpay_order_id: message.payload.razorpay_order_id,
          razorpay_payment_id: message.payload.razorpay_payment_id,
          razorpay_signature: message.payload.razorpay_signature,
          items,
          shippingAddress,
        });
        clearCart();
        router.replace({ pathname: '/order-confirmation', params: { orderId: String(order.id) } } as Href);
      } catch (err) {
        settledRef.current = false;
        setIsFinishingUp(false);
        const errorMessage =
          err instanceof Error ? err.message : 'Payment succeeded but the order could not be recorded. Please contact support.';
        router.replace({ pathname: '/checkout', params: { paymentError: errorMessage } });
      }
      return;
    }

    if (message.type === 'failed') {
      settledRef.current = true;
      router.replace({
        pathname: '/checkout',
        params: { paymentError: message.payload.description ?? 'Payment failed. Please try again.' },
      });
      return;
    }

    if (message.type === 'dismissed') {
      settledRef.current = true;
      router.back();
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Payment' }} />
      <WebView
        source={{ html }}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        style={styles.webview}
      />
      {isFinishingUp && (
        <ThemedView type="backgroundElement" style={styles.overlay}>
          <ActivityIndicator color={theme.textSecondary} />
          <ThemedText themeColor="textSecondary" style={styles.overlayText}>
            Confirming your order...
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  overlayText: {},
});
