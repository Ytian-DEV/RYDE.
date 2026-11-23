import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassIconButton, GlassSurface, PrimaryButton } from '@/components/ui';
import { RADII, TYPOGRAPHY } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRydeStore } from '@/store/useRydeStore';

export default function CompleteProfileScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const user = useRydeStore((s) => s.user);
  const completeAuth = useRydeStore((s) => s.completeAuth);

  const [firstName, setFirstName] = useState(user.firstName);
  const [middleName, setMiddleName] = useState(user.middleName);
  const [lastName, setLastName] = useState(user.lastName);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleFinish = () => {
    if (!canSubmit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    completeAuth(firstName, middleName, lastName);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.canvas }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 16) + 12,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topContent}>
          <GlassIconButton
            icon="chevron-back"
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          />

          <View style={styles.headerBlock}>
            <Text style={[TYPOGRAPHY.largeTitle, { color: colors.textPrimary }]}>
              Tell us your name
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>
              Drivers use your first name to confirm pickup quickly and safely.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                First name *
              </Text>
              <GlassSurface
                radius={RADII.lg}
                borderColor={
                  focusedField === 'first'
                    ? colors.brandGoldDeep
                    : colors.borderSpecular
                }
                contentStyle={styles.inputBox}
              >
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  onFocus={() => setFocusedField('first')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Chris"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                  style={[styles.input, { color: colors.textPrimary }]}
                />
              </GlassSurface>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Middle name (optional)
              </Text>
              <GlassSurface
                radius={RADII.lg}
                borderColor={
                  focusedField === 'middle'
                    ? colors.brandGoldDeep
                    : colors.borderSpecular
                }
                contentStyle={styles.inputBox}
              >
                <TextInput
                  value={middleName}
                  onChangeText={setMiddleName}
                  onFocus={() => setFocusedField('middle')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter middle name"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                  style={[styles.input, { color: colors.textPrimary }]}
                />
              </GlassSurface>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Last name *
              </Text>
              <GlassSurface
                radius={RADII.lg}
                borderColor={
                  focusedField === 'last'
                    ? colors.brandGoldDeep
                    : colors.borderSpecular
                }
                contentStyle={styles.inputBox}
              >
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  onFocus={() => setFocusedField('last')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Mendoza"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                  style={[styles.input, { color: colors.textPrimary }]}
                />
              </GlassSurface>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label="Get Started"
            onPress={handleFinish}
            disabled={!canSubmit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topContent: {
    gap: 20,
  },
  headerBlock: {
    gap: 8,
    marginTop: 6,
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputBox: {
    height: 56,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    height: '100%',
  },
  footer: {
    paddingTop: 24,
  },
});
