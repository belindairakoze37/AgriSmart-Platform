import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { ArrowRight, LogOut, MapPin, Phone, Sprout, UserRound } from 'lucide-react-native';
import { FeedbackState } from '../../components/FeedbackState';
import { LoadingState } from '../../components/LoadingState';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/theme';
import { farmApi, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [district, setDistrict] = useState('');
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.authError);
  const logout = useAuthStore((state) => state.logout);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const farmerProfileQuery = useQuery({
    queryKey: ['farmer-profile'],
    queryFn: async () => (await farmApi.getProfile()).data,
  });
  const locationMutation = useMutation({
    mutationFn: () =>
      farmApi.updateProfile({
        district: district.trim() || farmerProfileQuery.data?.district || '',
        sub_county: farmerProfileQuery.data?.sub_county ?? '',
        village: farmerProfileQuery.data?.village ?? '',
      }),
    onSuccess: async (response) => {
      setDistrict(response.data.district);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['farmer-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['farmer-weather'] }),
      ]);
      Alert.alert('Location saved', 'Weather information will use this district when map coordinates are available.');
    },
  });

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

      <View style={styles.locationCard}>
        <View style={styles.locationHeading}>
          <MapPin color={colors.primary} size={18} />
          <Text style={styles.locationTitle}>Farm district</Text>
        </View>
        <Text style={styles.locationHelp}>
          Use the district name in AgriSmart markets to connect local weather and farm information.
        </Text>
        <TextInput
          accessibilityLabel="Farm district"
          autoCapitalize="words"
          maxLength={100}
          onChangeText={setDistrict}
          placeholder="e.g. Gulu"
          placeholderTextColor="#9CA3AF"
          style={styles.locationInput}
          value={district || farmerProfileQuery.data?.district || ''}
        />
        {farmerProfileQuery.isError ? (
          <Text style={styles.locationError}>
            Could not load farm details: {getApiErrorMessage(farmerProfileQuery.error)}
          </Text>
        ) : null}
        {locationMutation.isError ? (
          <Text style={styles.locationError}>
            Could not save district: {getApiErrorMessage(locationMutation.error)}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={locationMutation.isPending || !(district || farmerProfileQuery.data?.district)}
          onPress={() => locationMutation.mutate()}
          style={[styles.saveLocation, locationMutation.isPending && styles.disabled]}
        >
          <Text style={styles.saveLocationText}>
            {locationMutation.isPending ? 'Saving…' : 'Save farm district'}
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/farms')}
        style={({ pressed }) => [styles.farmLink, pressed && styles.pressed]}
      >
        <View style={styles.farmLinkIcon}><Sprout color={colors.primary} size={18} /></View>
        <View style={styles.farmLinkCopy}>
          <Text style={styles.farmLinkTitle}>Manage farms and crops</Text>
          <Text style={styles.farmLinkText}>Track plots, planted area, and harvests.</Text>
        </View>
        <ArrowRight color={colors.primary} size={17} />
      </Pressable>

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
  locationCard: { backgroundColor: colors.white, borderRadius: 16, gap: 10, marginTop: 14, padding: 15 },
  locationHeading: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  locationTitle: { color: colors.darkGreen, fontSize: 14, fontWeight: '800' },
  locationHelp: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  locationInput: { borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, minHeight: 45, paddingHorizontal: 12 },
  locationError: { color: colors.error, fontSize: 11, lineHeight: 16 },
  saveLocation: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 10, justifyContent: 'center', minHeight: 40 },
  saveLocationText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  farmLink: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 15, flexDirection: 'row', gap: 11, marginTop: 14, minHeight: 66, paddingHorizontal: 13 },
  farmLinkIcon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 11, height: 36, justifyContent: 'center', width: 36 },
  farmLinkCopy: { flex: 1 },
  farmLinkTitle: { color: colors.darkGreen, fontSize: 12, fontWeight: '800' },
  farmLinkText: { color: colors.muted, fontSize: 10, marginTop: 4 },
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
