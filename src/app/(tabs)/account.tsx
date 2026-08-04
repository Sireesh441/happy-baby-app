import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function AccountScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, isLoading, logout } = useAuth();

  function goToOrderHistory() {
    if (user) {
      router.push('/order-history');
    } else {
      router.push({ pathname: '/login', params: { redirectTo: '/order-history' } });
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Account
        </ThemedText>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : user ? (
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</ThemedText>
            </View>
            <ThemedText type="smallBold">{user.name}</ThemedText>
            <ThemedText themeColor="textSecondary">{user.email}</ThemedText>

            <Pressable
              onPress={logout}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              style={styles.logoutButton}>
              <ThemedText type="smallBold" style={styles.logoutButtonText}>
                Log Out
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.guestState}>
            <ThemedText style={styles.guestEmoji}>👤</ThemedText>
            <ThemedText type="smallBold">You&apos;re browsing as a guest</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.guestText}>
              Log in or create an account to check out faster next time.
            </ThemedText>
            <Pressable
              onPress={() => router.push('/login')}
              accessibilityRole="button"
              accessibilityLabel="Go to log in"
              style={styles.primaryButton}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                Log In
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push('/signup')}
              accessibilityRole="button"
              accessibilityLabel="Go to sign up"
              style={styles.secondaryButton}>
              <ThemedText type="smallBold">Sign Up</ThemedText>
            </Pressable>
          </View>
        )}

        {!isLoading && (
          <View style={styles.menu}>
            <MenuRow icon="receipt-outline" label="Order History" onPress={goToOrderHistory} />
            <MenuRow icon="heart-outline" label="Wishlist" onPress={() => router.push('/wishlist')} />
            <MenuRow
              icon="chatbubble-ellipses-outline"
              label="Ask Happy Baby"
              onPress={() => router.push('/assistant')}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.menuRow}>
      <Ionicons name={icon} size={20} color={theme.text} />
      <ThemedText style={styles.menuRowLabel}>{label}</ThemedText>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.four }),
  },
  title: {
    marginBottom: Spacing.five,
  },
  menu: {
    marginTop: Spacing.five,
    gap: Spacing.one,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  menuRowLabel: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profile: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.five,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: Spacing.five,
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: '#dc2626',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  logoutButtonText: {
    color: '#dc2626',
  },
  guestState: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  guestEmoji: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  guestText: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    alignSelf: 'stretch',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
