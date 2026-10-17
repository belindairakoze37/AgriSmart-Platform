import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { ArrowRight, Sprout } from 'lucide-react-native';
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
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  phone: z
    .string()
    .trim()
    .min(9, 'Enter a valid phone number.')
    .max(17, 'Phone number is too long.'),
  password: z.string().min(1, 'Enter your password.'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const authError = useAuthStore((state) => state.authError);
  const isLoading = useAuthStore((state) => state.isLoading);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', password: '' },
  });

  const submit = handleSubmit(async ({ phone, password }) => {
    await login(phone, password);
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
        <View style={styles.brandMark}>
          <Sprout color={colors.white} size={30} strokeWidth={2.3} />
        </View>
        <Text style={styles.brand}>AgriSmart</Text>
        <Text style={styles.tagline}>Grow with better information.</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.helper}>
            Sign in to check your markets, crops, and farm advice.
          </Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  autoComplete="tel"
                  error={errors.phone?.message}
                  keyboardType="phone-pad"
                  label="Phone number"
                  onChangeText={onChange}
                  placeholder="+256 700 000 000"
                  textContentType="telephoneNumber"
                  value={value}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  autoComplete="password"
                  error={errors.password?.message}
                  label="Password"
                  onChangeText={onChange}
                  placeholder="Enter your password"
                  secureTextEntry
                  secureToggle
                  textContentType="password"
                  value={value}
                />
              )}
            />
            {authError ? (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            ) : null}
            <PrimaryButton
              accessibilityLabel="Sign in"
              loading={isSubmitting || isLoading}
              onPress={() => void submit()}
            >
              Sign in
            </PrimaryButton>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to AgriSmart? </Text>
            <Link href="/(auth)/register" asChild>
              <Text accessibilityRole="link" style={styles.link}>
                Create an account <ArrowRight color={colors.primary} size={14} />
              </Text>
            </Link>
          </View>
        </View>
        <Text style={styles.disclaimer}>
          Your account information is stored securely.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  brandMark: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 24,
    height: 64,
    justifyContent: 'center',
    marginBottom: 13,
    width: 64,
  },
  brand: {
    color: colors.darkGreen,
    fontSize: 29,
    fontWeight: '900',
    textAlign: 'center',
  },
  tagline: { color: colors.muted, fontSize: 14, marginTop: 5, textAlign: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    marginTop: 32,
    padding: 22,
    shadowColor: '#183C1B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  heading: { color: colors.darkGreen, fontSize: 23, fontWeight: '800' },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  form: { gap: 18, marginTop: 24 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: colors.error, fontSize: 13, lineHeight: 19 },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 22,
  },
  footerText: { color: colors.muted, fontSize: 13 },
  link: { alignItems: 'center', color: colors.primary, fontSize: 13, fontWeight: '800' },
  disclaimer: { color: colors.muted, fontSize: 11, marginTop: 18, textAlign: 'center' },
});
