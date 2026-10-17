import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../constants/theme';
import type { RegisterData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const schema = z
  .object({
    first_name: z.string().trim().min(1, 'Enter your first name.'),
    last_name: z.string().trim().min(1, 'Enter your last name.'),
    phone_number: z.string().trim().min(9, 'Enter a valid phone number.').max(17),
    email: z.union([z.literal(''), z.string().email('Enter a valid email.')]),
    password: z.string().min(8, 'Use at least 8 characters.'),
    password_confirm: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.password_confirm, {
    message: 'Passwords do not match.',
    path: ['password_confirm'],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const authError = useAuthStore((state) => state.authError);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone_number: '',
      email: '',
      password: '',
      password_confirm: '',
    },
  });

  const submit = handleSubmit(async (values) => {
    const data: RegisterData = {
      ...values,
      ...(values.email ? { email: values.email } : {}),
    };
    await register(data);
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>JOIN AGRISMART</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Set up your farmer profile to get started.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.half}>
              <Controller
                control={control}
                name="first_name"
                render={({ field: { onChange, value } }) => (
                  <FormInput
                    autoCapitalize="words"
                    error={errors.first_name?.message}
                    label="First name"
                    onChangeText={onChange}
                    placeholder="First name"
                    value={value}
                  />
                )}
              />
            </View>
            <View style={styles.half}>
              <Controller
                control={control}
                name="last_name"
                render={({ field: { onChange, value } }) => (
                  <FormInput
                    autoCapitalize="words"
                    error={errors.last_name?.message}
                    label="Last name"
                    onChangeText={onChange}
                    placeholder="Last name"
                    value={value}
                  />
                )}
              />
            </View>
          </View>
          <Controller
            control={control}
            name="phone_number"
            render={({ field: { onChange, value } }) => (
              <FormInput
                autoComplete="tel"
                error={errors.phone_number?.message}
                keyboardType="phone-pad"
                label="Phone number"
                onChangeText={onChange}
                placeholder="+256 700 000 000"
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <FormInput
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email?.message}
                keyboardType="email-address"
                label="Email (optional)"
                onChangeText={onChange}
                placeholder="you@example.com"
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <FormInput
                autoComplete="new-password"
                error={errors.password?.message}
                label="Password"
                onChangeText={onChange}
                placeholder="At least 8 characters"
                secureTextEntry
                secureToggle
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="password_confirm"
            render={({ field: { onChange, value } }) => (
              <FormInput
                autoComplete="new-password"
                error={errors.password_confirm?.message}
                label="Confirm password"
                onChangeText={onChange}
                placeholder="Enter password again"
                secureTextEntry
                secureToggle
                value={value}
              />
            )}
          />
          {authError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {authError}
            </Text>
          ) : null}
          <PrimaryButton loading={isSubmitting} onPress={() => void submit()}>
            Create account
          </PrimaryButton>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already registered? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: colors.darkGreen, fontSize: 27, fontWeight: '900', marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 6 },
  card: { backgroundColor: colors.white, borderRadius: 20, gap: 16, marginTop: 24, padding: 18 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  error: { backgroundColor: '#FEF2F2', borderRadius: 10, color: colors.error, fontSize: 13, padding: 11 },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  footerText: { color: colors.muted, fontSize: 13 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '800' },
});
