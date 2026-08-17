import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getSizeChartForVertical } from '@/constants/size-charts';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { ProductVertical } from '@/lib/api';
import { fetchPersonProfiles, fetchFitScore, type PersonProfile, type FitScoreResult } from '@/lib/fit-engine-api';

type FitConfidenceProps = {
  vertical: ProductVertical;
};

// No product has real per-item measurement data yet, so this always scores
// against the generic per-vertical chart in @/constants/size-charts rather
// than something specific to this product -- see that file for why.
export function FitConfidence({ vertical }: FitConfidenceProps) {
  const router = useRouter();
  const theme = useTheme();
  const { user, token } = useAuth();

  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [result, setResult] = useState<FitScoreResult | null>(null);
  const [isLoadingScore, setIsLoadingScore] = useState(false);
  const [scoreError, setScoreError] = useState(false);

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    setIsLoadingProfiles(true);
    setProfilesError(false);

    fetchPersonProfiles(token)
      .then((fetched) => {
        if (cancelled) return;
        setProfiles(fetched);
        setSelectedId((current) => current ?? fetched[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfilesError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfiles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, token]);

  useEffect(() => {
    if (!token || selectedId == null) {
      setResult(null);
      return;
    }

    let cancelled = false;
    setIsLoadingScore(true);
    setScoreError(false);

    fetchFitScore(token, { personProfileId: selectedId, sizeChart: getSizeChartForVertical(vertical) })
      .then((score) => {
        if (!cancelled) setResult(score);
      })
      .catch(() => {
        if (!cancelled) setScoreError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingScore(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, selectedId, vertical]);

  if (!user || !token) {
    return (
      <View style={styles.container}>
        <ThemedText type="smallBold">Fit Confidence</ThemedText>
        <Pressable
          onPress={() => router.push('/login')}
          accessibilityRole="button"
          accessibilityLabel="Log in to see fit confidence">
          <ThemedText type="small" themeColor="textSecondary" style={styles.promptText}>
            Log in to see a fit recommendation for your family.
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (isLoadingProfiles) {
    return (
      <View style={styles.container}>
        <ThemedText type="smallBold">Fit Confidence</ThemedText>
        <ActivityIndicator color={theme.textSecondary} style={styles.spinner} />
      </View>
    );
  }

  // Supplementary section -- fail silently rather than block the rest of the page.
  if (profilesError) return null;

  if (profiles.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText type="smallBold">Fit Confidence</ThemedText>
        <Pressable
          onPress={() => router.push('/my-people')}
          accessibilityRole="button"
          accessibilityLabel="Add a person to My People">
          <ThemedText type="small" themeColor="textSecondary" style={styles.promptText}>
            Add someone to My People to get a personalized size recommendation.
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  const selectedProfile = profiles.find((profile) => profile.id === selectedId);

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Fit Confidence</ThemedText>

      <View style={styles.chipRow}>
        {profiles.map((profile) => {
          const isSelected = selectedId === profile.id;
          return (
            <Pressable
              key={profile.id}
              onPress={() => setSelectedId(profile.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={[styles.chip, isSelected && styles.chipSelected]}>
              <ThemedText type="small" style={isSelected ? styles.chipTextSelected : undefined}>
                {profile.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {isLoadingScore ? (
        <ActivityIndicator color={theme.textSecondary} style={styles.spinner} />
      ) : scoreError ? (
        <ThemedText type="small" themeColor="textSecondary">
          Couldn&apos;t calculate a fit recommendation right now.
        </ThemedText>
      ) : result && selectedProfile ? (
        <View style={styles.resultCard}>
          <ThemedText type="smallBold" style={styles.resultText}>
            {result.matchScorePercent}% match for {selectedProfile.name} — Size {result.recommendedSize}
          </ThemedText>
          {/* Only flag the estimate when it actually affected this result -- a
              profile can have some dimensions estimated from age and others
              real, and only the ones this size chart compares against matter. */}
          {result.measurementsUsed.some((dimension) => result.estimatedDimensions.includes(dimension)) && (
            <ThemedText type="small" themeColor="textSecondary">
              Estimated from age — add real measurements for a more precise match.
            </ThemedText>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  promptText: {
    textDecorationLine: 'underline',
  },
  spinner: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chipSelected: {
    borderColor: '#3c87f7',
    backgroundColor: 'rgba(60,135,247,0.1)',
  },
  chipTextSelected: {
    color: '#3c87f7',
  },
  resultCard: {
    backgroundColor: 'rgba(22,163,74,0.1)',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: 2,
  },
  resultText: {
    color: '#16a34a',
  },
});
