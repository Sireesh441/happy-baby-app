import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function CheckoutScreen() {
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <View style={styles.content}>
        <ThemedText style={styles.emoji}>🚧</ThemedText>
        <ThemedText type="smallBold">Checkout is coming soon</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.body}>
          We&apos;re still building this part. Your cart is saved, so it&apos;ll be right here when
          checkout is ready.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.five,
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  body: {
    textAlign: 'center',
  },
});
