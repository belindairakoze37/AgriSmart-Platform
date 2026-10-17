import { useQueryClient } from '@tanstack/react-query';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LogOut, MapPin, Phone, UserRound } from 'lucide-react-native';
import { FeedbackState } from '../../components/FeedbackState';
import { LoadingState } from '../../components/LoadingState';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.authError);
  const logout = useAuthStore((state) => state.logout);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  const confirmLogout = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to use your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void logout()
            .then(() => queryClient.clear())
            .catch(() =>
              Alert.alert(
                'Could not sign out',
                'Securely clearing this session failed. Please try again.',
              ),
            );
        },
      },
    ]);
  };

  if (isLoading) return <LoadingState label="Loading your profile..." />;

  if (!user) {
    return (
      <View style={styles.center}>
        <FeedbackState
          actionLabel="Retry"
          kind="error"
          message={authError ?? 'Your profile could not be loaded right now.'}
          onAction={() => void initializeAuth()}
          title="Profile unavailable"
        />
      </View>
    );
  }

  const initials =
    `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() ||
    'A';

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="YOUR AGRISMART ACCOUNT"
        subtitle="Manage your personal account details."
        title="Profile"
      />
      <View style={styles.profileCard}>
        {user.profile_picture ? (
          <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
        <Text style={styles.name}>
          {user.full_name ||
            [user.first_name, user.last_name].filter(Boolean).join(' ') ||
            'AgriSmart user'}
        </Text>
        <Text style={styles.role}>{user.role.replaceAll('_', ' ')}</Text>
        {user.is_phone_verified ? (
          <View style={styles.verified}>
            <Text style={styles.verifiedText}>Phone verified</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.detailsCard}>
        <ProfileDetail
          icon={<Phone color={colors.primary} size={18} />}
          label="Phone number"
          value={user.phone_number}
        />
        {user.email ? (
          <ProfileDetail
            icon={<UserRound color={colors.primary} size={18} />}
            label="Email"
            value={user.email}
          />
        ) : null}
        <ProfileDetail
          icon={<MapPin color={colors.primary} size={18} />}
          label="Preferred language"
          value={user.preferred_language.toUpperCase()}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={confirmLogout}
        style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
      >
        <LogOut color={colors.error} size={18} />
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
      <Text style={styles.version}>AgriSmart · Your farming companion</Text>
    </Screen>
  );
}

function ProfileDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 19,
    padding: 23,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.paleGreen,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  initials: { color: colors.primary, fontSize: 25, fontWeight: '900' },
  name: {
    color: colors.darkGreen,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 13,
    textAlign: 'center',
  },
  role: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  verified: {
    backgroundColor: colors.paleGreen,
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  verifiedText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    marginTop: 14,
    paddingHorizontal: 15,
  },
  detailRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 15,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: colors.paleGreen,
    borderRadius: 11,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  detailCopy: { flex: 1 },
  detailLabel: { color: colors.muted, fontSize: 11 },
  detailValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 23,
    minHeight: 51,
  },
  logoutText: { color: colors.error, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  version: { color: colors.muted, fontSize: 10, marginTop: 16, textAlign: 'center' },
});
