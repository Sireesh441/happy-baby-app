import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { useTheme } from '@/hooks/use-theme';
import { fetchAddresses, createAddress as createAddressRequest, type Address } from '@/lib/addresses-api';
import { createRazorpayOrder, placeOrder } from '@/lib/orders-api';
import { openRazorpayWebCheckout, RazorpayDismissedError } from '@/lib/razorpay-web';

const SHIPPING_FEE = 49;
const FREE_SHIPPING_THRESHOLD = 999;
const PINCODE_PATTERN = /^\d{6}$/;

type NewAddressForm = {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

const EMPTY_FORM: NewAddressForm = { name: '', phone: '', line1: '', city: '', state: '', pincode: '' };

export default function CheckoutScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const { lines, itemCount, subtotal, isLoaded: isCartLoaded, clearCart } = useCart();
  const { paymentError } = useLocalSearchParams<{ paymentError?: string }>();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<NewAddressForm>(EMPTY_FORM);
  const [saveAddress, setSaveAddress] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Defensive guard for direct deep links while logged out or with an empty
  // cart — the normal entry point (cart tab) already checks both.
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace({ pathname: '/login', params: { redirectTo: '/checkout' } });
    }
  }, [isAuthLoading, user, router]);

  useEffect(() => {
    if (isCartLoaded && lines.length === 0) {
      router.replace('/');
    }
  }, [isCartLoaded, lines.length, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchAddresses(token)
      .then((result) => {
        if (cancelled) return;
        setAddresses(result);
        setSelectedAddressId(result.length > 0 ? result[0].id : 'new');
      })
      .catch(() => {
        if (!cancelled) setSelectedAddressId('new');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAddresses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (paymentError) setErrorMessage(paymentError);
  }, [paymentError]);

  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingFee;

  const isNewAddressValid =
    form.name.trim().length > 0 &&
    form.phone.trim().length >= 10 &&
    form.line1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.trim().length > 0 &&
    PINCODE_PATTERN.test(form.pincode.trim());

  const canPlaceOrder =
    !isPlacingOrder && (selectedAddressId === 'new' ? isNewAddressValid : selectedAddressId !== null);

  function updateForm(key: keyof NewAddressForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handlePlaceOrder() {
    if (!token || !user || !canPlaceOrder) return;
    setErrorMessage(null);
    setIsPlacingOrder(true);

    try {
      let shippingAddress: NewAddressForm;

      if (selectedAddressId === 'new') {
        shippingAddress = {
          name: form.name.trim(),
          phone: form.phone.trim(),
          line1: form.line1.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
        };
        if (saveAddress) {
          await createAddressRequest(token, shippingAddress);
        }
      } else {
        const saved = addresses.find((address) => address.id === selectedAddressId);
        if (!saved) throw new Error('Please choose a shipping address.');
        shippingAddress = saved;
      }

      const razorpayOrder = await createRazorpayOrder(token, total);
      // Bulk lines send { type: 'bulk', productGroupId, packSize, breakdown, packs }
      // -- no price field, on purpose. happy-baby's POST /api/orders re-resolves
      // pricePerUnit itself from the ProductGroup's current bulkPricing and
      // never trusts anything this app might send, same discipline retail
      // items get (their price is looked up server-side too, never sent here).
      const items = lines.map((line) =>
        line.type === 'bulk'
          ? {
              type: 'bulk' as const,
              productGroupId: line.productGroupId,
              packSize: line.packSize,
              breakdown: line.breakdownDisplay.map(({ productId, size, quantity }) => ({ productId, size, quantity })),
              packs: line.quantity,
            }
          : { productId: line.productId, quantity: line.quantity }
      );

      // Native keeps the WebView-based flow (Razorpay's RN SDK doesn't support
      // the New Architecture setup this app uses). Web has no react-native-webview
      // implementation at all, so it loads Razorpay's Checkout.js directly instead
      // and completes the order on this same screen rather than a separate route.
      if (Platform.OS === 'web') {
        const response = await openRazorpayWebCheckout({
          keyId: razorpayOrder.keyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          orderId: razorpayOrder.orderId,
          name: user.name,
          email: user.email,
          contact: shippingAddress.phone,
        });
        const order = await placeOrder(token, {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          items,
          shippingAddress,
        });
        clearCart();
        router.replace({ pathname: '/order-confirmation', params: { orderId: String(order.id) } } as Href);
        return;
      }

      router.push({
        pathname: '/razorpay-checkout',
        params: {
          keyId: razorpayOrder.keyId,
          amount: String(razorpayOrder.amount),
          currency: razorpayOrder.currency,
          orderId: razorpayOrder.orderId,
          name: user.name,
          email: user.email,
          contact: shippingAddress.phone,
          items: encodeURIComponent(JSON.stringify(items)),
          shippingAddress: encodeURIComponent(JSON.stringify(shippingAddress)),
        },
      } as Href);
    } catch (err) {
      if (!(err instanceof RazorpayDismissedError)) {
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setIsPlacingOrder(false);
    }
  }

  if (isAuthLoading || !isCartLoaded || lines.length === 0) {
    return (
      <ThemedView style={styles.statusContainer}>
        <Stack.Screen options={{ title: 'Checkout' }} />
        <ActivityIndicator color={theme.textSecondary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <ThemedText type="smallBold">Shipping Address</ThemedText>

          {isLoadingAddresses ? (
            <ActivityIndicator color={theme.textSecondary} style={styles.addressLoading} />
          ) : (
            <>
              {addresses.map((address) => (
                <Pressable
                  key={address.id}
                  onPress={() => setSelectedAddressId(address.id)}
                  style={[
                    styles.addressCard,
                    { backgroundColor: theme.backgroundElement },
                    selectedAddressId === address.id && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <ThemedText type="smallBold">{address.name}</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    {address.line1}, {address.city}, {address.state} {address.pincode}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    {address.phone}
                  </ThemedText>
                </Pressable>
              ))}

              <Pressable
                onPress={() => setSelectedAddressId('new')}
                style={[
                  styles.addressCard,
                  { backgroundColor: theme.backgroundElement },
                  selectedAddressId === 'new' && { backgroundColor: theme.backgroundSelected },
                ]}>
                <ThemedText type="smallBold">+ Add a new address</ThemedText>
              </Pressable>

              {selectedAddressId === 'new' && (
                <View style={styles.form}>
                  <AddressInput
                    placeholder="Full name"
                    value={form.name}
                    onChangeText={(value) => updateForm('name', value)}
                  />
                  <AddressInput
                    placeholder="Phone number"
                    value={form.phone}
                    onChangeText={(value) => updateForm('phone', value)}
                    keyboardType="phone-pad"
                  />
                  <AddressInput
                    placeholder="Address line"
                    value={form.line1}
                    onChangeText={(value) => updateForm('line1', value)}
                  />
                  <AddressInput
                    placeholder="City"
                    value={form.city}
                    onChangeText={(value) => updateForm('city', value)}
                  />
                  <AddressInput
                    placeholder="State"
                    value={form.state}
                    onChangeText={(value) => updateForm('state', value)}
                  />
                  <AddressInput
                    placeholder="Pincode"
                    value={form.pincode}
                    onChangeText={(value) => updateForm('pincode', value)}
                    keyboardType="number-pad"
                    maxLength={6}
                  />

                  <Pressable
                    onPress={() => setSaveAddress((current) => !current)}
                    style={styles.checkboxRow}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: saveAddress }}>
                    <View
                      style={[
                        styles.checkboxBox,
                        { borderColor: theme.textSecondary },
                        saveAddress && styles.checkboxBoxChecked,
                      ]}>
                      {saveAddress && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
                    </View>
                    <ThemedText themeColor="textSecondary" type="small">
                      Save this address for later
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Order Summary</ThemedText>
          {lines.map((line) =>
            line.type === 'bulk' ? (
              <View key={line.id} style={styles.summaryLine}>
                <ThemedText themeColor="textSecondary" style={styles.summaryLineName} numberOfLines={1}>
                  {line.productGroupName} — Bulk {line.packSize}-Pack × {line.quantity}
                </ThemedText>
                <ThemedText>₹{line.pricePerUnit * line.packSize * line.quantity}</ThemedText>
              </View>
            ) : (
              <View key={line.productId} style={styles.summaryLine}>
                <ThemedText themeColor="textSecondary" style={styles.summaryLineName} numberOfLines={1}>
                  {line.product.name} × {line.quantity}
                </ThemedText>
                <ThemedText>₹{line.product.price * line.quantity}</ThemedText>
              </View>
            )
          )}
        </View>
      </ScrollView>

      <ThemedView
        type="backgroundElement"
        style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <View style={styles.totalsRow}>
          <ThemedText themeColor="textSecondary">Subtotal ({itemCount})</ThemedText>
          <ThemedText>₹{subtotal}</ThemedText>
        </View>
        <View style={styles.totalsRow}>
          <ThemedText themeColor="textSecondary">Shipping</ThemedText>
          <ThemedText>{shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</ThemedText>
        </View>
        <View style={styles.totalsRow}>
          <ThemedText type="smallBold">Total</ThemedText>
          <ThemedText type="smallBold">₹{total}</ThemedText>
        </View>

        {errorMessage && <ThemedText style={styles.error}>{errorMessage}</ThemedText>}

        <Pressable
          onPress={handlePlaceOrder}
          disabled={!canPlaceOrder}
          style={[styles.placeOrderButton, !canPlaceOrder && styles.placeOrderButtonDisabled]}>
          <ThemedText type="smallBold" style={styles.placeOrderButtonText}>
            {isPlacingOrder ? 'Processing...' : 'Place Order'}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

function AddressInput(props: ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.inputWrapper}>
      <TextInput {...props} placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text }]} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  addressLoading: {
    marginTop: Spacing.two,
  },
  addressCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  form: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  inputWrapper: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  input: {
    fontSize: 16,
    paddingVertical: Spacing.three,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: Spacing.half,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  checkboxMark: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 14,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  summaryLineName: {
    flex: 1,
  },
  stickyBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.one,
    ...Platform.select({
      web: { boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  error: {
    color: '#dc2626',
    marginTop: Spacing.one,
  },
  placeOrderButton: {
    marginTop: Spacing.two,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    opacity: 0.5,
  },
  placeOrderButtonText: {
    color: '#ffffff',
  },
});
