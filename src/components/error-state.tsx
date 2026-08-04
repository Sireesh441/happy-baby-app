import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ErrorStateProps = {
  message?: string;
  onRetry: () => void;
};

export function ErrorState({ message = "Something went wrong.", onRetry }: ErrorStateProps) {
  return (
    <Pressable
      onPress={onRetry}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel="Tap to retry">
      <ThemedText style={styles.emoji}>⚠️</ThemedText>
      <ThemedText type="smallBold" style={styles.message}>
        {message}
      </ThemedText>
      <View style={styles.retryPill}>
        <ThemedText type="smallBold" style={styles.retryText}>
          Tap to retry
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.five,
  },
  emoji: {
    fontSize: 40,
    marginBottom: Spacing.one,
  },
  message: {
    textAlign: 'center',
  },
  retryPill: {
    marginTop: Spacing.three,
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: '#3c87f7',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  retryText: {
    color: '#3c87f7',
  },
});
