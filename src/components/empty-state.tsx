import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type EmptyStateProps = {
  emoji: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ emoji, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.button} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </View>
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
    fontSize: 56,
    marginBottom: Spacing.two,
  },
  message: {
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.four,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  buttonText: {
    color: '#ffffff',
  },
});
