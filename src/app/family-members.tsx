import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import {
  createFamilyProfile,
  deleteFamilyProfile,
  fetchFamilyProfiles,
  updateFamilyProfile,
  type FamilyProfile,
} from '@/lib/fit-engine-api';

const RELATION_SUGGESTIONS = ['Self', 'Spouse', 'Child', 'Parent'];
const SKELETON_CARD_COUNT = 3;
const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Whole years elapsed since `dob`, floored -- matches fit-engine's own age semantics. */
function computeAgeFromDob(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

function summarize(profile: FamilyProfile): string {
  const parts: string[] = [];
  if (profile.age != null) parts.push(`${profile.age} yrs`);
  if (profile.heightCm != null) parts.push(`${profile.heightCm} cm`);
  if (profile.weightKg != null) parts.push(`${profile.weightKg} kg`);
  return parts.length > 0 ? parts.join(' · ') : 'No measurements yet';
}

export default function FamilyMembersScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, token, isLoading: isAuthLoading } = useAuth();

  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<FamilyProfile | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user || !token) {
      router.replace({ pathname: '/login', params: { redirectTo: '/family-members' } });
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    fetchFamilyProfiles(token)
      .then((result) => {
        if (!cancelled) setProfiles(result);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, token, isAuthLoading, router, retryKey]);

  function openAddModal() {
    setEditingProfile(null);
    setIsModalVisible(true);
  }

  function openEditModal(profile: FamilyProfile) {
    setEditingProfile(profile);
    setIsModalVisible(true);
  }

  function handleSaved(saved: FamilyProfile) {
    setProfiles((current) => {
      const exists = current.some((profile) => profile.id === saved.id);
      return exists ? current.map((profile) => (profile.id === saved.id ? saved : profile)) : [saved, ...current];
    });
    setIsModalVisible(false);
  }

  function handleDelete(profile: FamilyProfile) {
    if (!token) return;
    Alert.alert('Remove family member?', `This will delete ${profile.name}'s profile.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFamilyProfile(token, profile.id);
            setProfiles((current) => current.filter((item) => item.id !== profile.id));
          } catch (error) {
            Alert.alert('Could not remove', error instanceof Error ? error.message : 'Please try again.');
          }
        },
      },
    ]);
  }

  if (isAuthLoading) {
    return (
      <ThemedView style={styles.statusContainer}>
        <Stack.Screen options={{ title: 'Family Members' }} />
        <ActivityIndicator color={theme.textSecondary} />
      </ThemedView>
    );
  }

  if (isLoading && profiles.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Family Members' }} />
        <View style={styles.listContent}>
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <View key={index} style={styles.card}>
              <Skeleton width="40%" height={16} />
              <Skeleton width="60%" height={13} style={styles.skeletonSpacing} />
            </View>
          ))}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Family Members' }} />

      {hasError ? (
        <ErrorState message="Couldn't load family members. Check your connection." onRetry={() => setRetryKey((k) => k + 1)} />
      ) : profiles.length === 0 ? (
        <EmptyState
          emoji="👨‍👩‍👧"
          title="No family members yet"
          message="Add profiles for the people you shop for to get personalized fit recommendations."
          actionLabel="Add Family Member"
          onAction={openAddModal}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {profiles.map((profile) => (
            // Two sibling Pressables, not nested -- Pressable renders as a
            // <button> on web, and a <button> inside a <button> is invalid
            // HTML that breaks click handling for both.
            <ThemedView key={profile.id} type="backgroundElement" style={styles.card}>
              <Pressable
                onPress={() => openEditModal(profile)}
                style={styles.cardText}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${profile.name}`}>
                <ThemedText type="smallBold">{profile.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {profile.relation} · {summarize(profile)}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(profile)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${profile.name}`}>
                <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
              </Pressable>
            </ThemedView>
          ))}
        </ScrollView>
      )}

      {!hasError && profiles.length > 0 && (
        <Pressable
          onPress={openAddModal}
          style={[styles.fab, { bottom: Math.max(insets.bottom, Spacing.four) }]}
          accessibilityRole="button"
          accessibilityLabel="Add family member">
          <Ionicons name="add" size={26} color="#ffffff" />
        </Pressable>
      )}

      <FamilyMemberModal
        visible={isModalVisible}
        token={token}
        profile={editingProfile}
        onClose={() => setIsModalVisible(false)}
        onSaved={handleSaved}
      />
    </ThemedView>
  );
}

function FamilyMemberModal({
  visible,
  token,
  profile,
  onClose,
  onSaved,
}: {
  visible: boolean;
  token: string | null;
  profile: FamilyProfile | null;
  onClose: () => void;
  onSaved: (profile: FamilyProfile) => void;
}) {
  const theme = useTheme();
  const isEditing = profile != null;

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [ageMode, setAgeMode] = useState<'age' | 'dob'>('age');
  const [ageText, setAgeText] = useState('');
  const [dobText, setDobText] = useState('');
  const [heightText, setHeightText] = useState('');
  const [weightText, setWeightText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset the form to match whichever profile (or blank, for "add") is open
  // each time the modal opens -- otherwise the previous edit's values leak in.
  useEffect(() => {
    if (!visible) return;
    setName(profile?.name ?? '');
    setRelation(profile?.relation ?? '');
    setAgeMode(profile?.dateOfBirth ? 'dob' : 'age');
    setAgeText(profile?.age != null ? String(profile.age) : '');
    setDobText(profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '');
    setHeightText(profile?.heightCm != null ? String(profile.heightCm) : '');
    setWeightText(profile?.weightKg != null ? String(profile.weightKg) : '');
    setFormError(null);
  }, [visible, profile]);

  async function handleSave() {
    if (!token) return;

    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!relation.trim()) {
      setFormError('Relation is required.');
      return;
    }

    let age: number | undefined;
    let dateOfBirth: string | undefined;

    if (ageMode === 'dob' && dobText.trim()) {
      if (!DOB_PATTERN.test(dobText.trim())) {
        setFormError('Date of birth must be in YYYY-MM-DD format.');
        return;
      }
      const parsed = new Date(dobText.trim());
      if (Number.isNaN(parsed.getTime())) {
        setFormError('That date of birth is not valid.');
        return;
      }
      dateOfBirth = dobText.trim();
      age = computeAgeFromDob(parsed);
    } else if (ageMode === 'age' && ageText.trim()) {
      const parsedAge = Number(ageText.trim());
      if (!Number.isInteger(parsedAge) || parsedAge < 0) {
        setFormError('Age must be a whole number.');
        return;
      }
      age = parsedAge;
    }

    let heightCm: number | undefined;
    if (heightText.trim()) {
      heightCm = Number(heightText.trim());
      if (!Number.isFinite(heightCm) || heightCm <= 0) {
        setFormError('Height must be a number.');
        return;
      }
    }

    let weightKg: number | undefined;
    if (weightText.trim()) {
      weightKg = Number(weightText.trim());
      if (!Number.isFinite(weightKg) || weightKg <= 0) {
        setFormError('Weight must be a number.');
        return;
      }
    }

    setFormError(null);
    setIsSaving(true);
    try {
      const input = { name: name.trim(), relation: relation.trim(), age, dateOfBirth, heightCm, weightKg };
      const saved = isEditing
        ? await updateFamilyProfile(token, profile.id, input)
        : await createFamilyProfile(token, input);
      onSaved(saved);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ThemedView style={styles.modalSheet}>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <ThemedText type="smallBold">{isEditing ? 'Edit Family Member' : 'Add Family Member'}</ThemedText>
              <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            <FormField label="Name">
              <FormInput value={name} onChangeText={setName} placeholder="e.g. Emma" />
            </FormField>

            <FormField label="Relation">
              <FormInput value={relation} onChangeText={setRelation} placeholder="e.g. Child" />
              <View style={styles.chipRow}>
                {RELATION_SUGGESTIONS.map((option) => (
                  <Pressable key={option} onPress={() => setRelation(option)} style={styles.chip}>
                    <ThemedText type="small">{option}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </FormField>

            <FormField label="Age">
              <View style={styles.modeToggle}>
                <ModeButton label="Age (years)" active={ageMode === 'age'} onPress={() => setAgeMode('age')} />
                <ModeButton label="Date of Birth" active={ageMode === 'dob'} onPress={() => setAgeMode('dob')} />
              </View>
              {ageMode === 'age' ? (
                <FormInput value={ageText} onChangeText={setAgeText} placeholder="e.g. 5" keyboardType="number-pad" />
              ) : (
                <FormInput value={dobText} onChangeText={setDobText} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
              )}
            </FormField>

            <View style={styles.row}>
              <FormField label="Height (cm)" style={styles.rowField}>
                <FormInput value={heightText} onChangeText={setHeightText} placeholder="e.g. 110" keyboardType="decimal-pad" />
              </FormField>
              <FormField label="Weight (kg)" style={styles.rowField}>
                <FormInput value={weightText} onChangeText={setWeightText} placeholder="e.g. 18" keyboardType="decimal-pad" />
              </FormField>
            </View>

            {formError && (
              <ThemedText type="small" style={styles.formError}>
                {formError}
              </ThemedText>
            )}

            <Pressable onPress={handleSave} disabled={isSaving} style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText type="smallBold" style={styles.saveButtonText}>
                  {isEditing ? 'Save Changes' : 'Add Family Member'}
                </ThemedText>
              )}
            </Pressable>
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

function FormField({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.field, style]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

function FormInput(props: ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.inputWrapper}>
      <TextInput {...props} placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text }]} />
    </ThemedView>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}>
      <ThemedText type="small" style={active ? styles.modeButtonTextActive : undefined}>
        {label}
      </ThemedText>
    </Pressable>
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
  listContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  skeletonSpacing: {
    marginTop: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(60,135,247,0.4)' },
      default: {
        shadowColor: '#3c87f7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: Spacing.five,
    borderTopRightRadius: Spacing.five,
    maxHeight: '85%',
  },
  modalContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  field: {
    gap: Spacing.one,
  },
  rowField: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  inputWrapper: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  input: {
    fontSize: 16,
    paddingVertical: Spacing.three,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  chip: {
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  modeButton: {
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  modeButtonActive: {
    borderColor: '#3c87f7',
    backgroundColor: 'rgba(60,135,247,0.1)',
  },
  modeButtonTextActive: {
    color: '#3c87f7',
  },
  formError: {
    color: '#dc2626',
  },
  saveButton: {
    marginTop: Spacing.two,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
  },
});
