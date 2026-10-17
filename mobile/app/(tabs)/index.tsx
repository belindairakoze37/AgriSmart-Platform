import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Bell,
  Camera,
  CloudRain,
  CloudSun,
  Leaf,
  MessageCircle,
  ShoppingBasket,
  Sprout,
} from 'lucide-react-native';
import { useCallback } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CommodityCard } from '../../components/CommodityCard';
import { FeedbackState } from '../../components/FeedbackState';
import { LoadingState } from '../../components/LoadingState';
import { Screen } from '../../components/Screen';
import { colors } from '../../constants/theme';
import {
  farmApi,
  getApiErrorMessage,
  marketsApi,
  notificationsApi,
} from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const quickActions = [
  { label: 'Market prices', Icon: Leaf, route: '/(tabs)/markets', tone: '#E8F5E9' },
  { label: 'Ask an advisor', Icon: MessageCircle, route: '/(tabs)/advisory', tone: '#EAF1FF' },
  { label: 'Detect disease', Icon: Camera, route: '/diseases/detect', tone: '#FDECEC' },
  { label: 'Find produce', Icon: ShoppingBasket, route: '/(tabs)/marketplace', tone: '#FFF4E5' },
  { label: 'Manage my farm', Icon: Sprout, route: '/farms', tone: '#EAF4E8' },
] as const;

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const weatherQuery = useQuery({
    queryKey: ['farmer-weather'],
    queryFn: async () => (await farmApi.getWeather()).data,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const commoditiesQuery = useQuery({
    queryKey: ['markets', 'commodities'],
    queryFn: async () => (await marketsApi.getCommodities()).data,
  });
  const commodities = commoditiesQuery.data ?? [];
  const topCommodities = commodities.slice(0, 3);
  const priceQueries = useQueries({
    queries: topCommodities.map((commodity) => ({
      queryKey: ['markets', 'current-price', commodity.id],
      queryFn: async () =>
        (await marketsApi.getCurrentPrices(commodity.id, 1)).data,
      staleTime: 5 * 60_000,
    })),
  });
  const farmsQuery = useQuery({
    queryKey: ['farms'],
    queryFn: async () => (await farmApi.getFarms()).data,
  });
  const cropsQuery = useQuery({
    queryKey: ['crops'],
    queryFn: async () => (await farmApi.getCrops()).data,
  });
  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => (await notificationsApi.getUnread()).data,
  });
  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: unknown) =>
      Alert.alert('Could not update alerts', getApiErrorMessage(error)),
  });
  const markReadMutation = useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      notificationsApi.updateRead(id, isRead),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: unknown) =>
      Alert.alert('Could not update alert', getApiErrorMessage(error)),
  });
  const refresh = useCallback(() => {
    void commoditiesQuery.refetch();
    void weatherQuery.refetch();
    priceQueries.forEach((query) => {
      if (query.refetch) void query.refetch();
    });
  }, [commoditiesQuery, priceQueries, weatherQuery]);

  const loadingPrices = priceQueries.some((query) => query.isPending);
  const priceError = priceQueries.find((query) => query.isError)?.error;

  return (
    <Screen
      scroll
      contentContainerStyle={styles.screenContent}
      refreshControl={
        <RefreshControl
          colors={[colors.primary]}
          onRefresh={refresh}
          refreshing={commoditiesQuery.isRefetching || priceQueries.some((q) => q.isRefetching)}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.topline}>
        <View style={styles.greetingBlock}>
          <Text style={styles.eyebrow}>AGRISMART · UGANDA</Text>
          <Text style={styles.greeting}>
            Hello{user?.first_name ? `, ${user.first_name}` : ''}
          </Text>
          <Text style={styles.subtitle}>A better day starts with a good plan.</Text>
        </View>
        <Pressable
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>
            {(user?.first_name?.[0] || user?.phone_number?.[0] || 'A').toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <View style={styles.weatherCard}>
        {weatherQuery.isPending ? (
          <Text style={styles.weatherMessage}>Checking local weather…</Text>
        ) : weatherQuery.isError ? (
          <View style={styles.weatherError}>
            <CloudSun color={colors.primary} size={19} />
            <Text style={styles.weatherMessage}>
              Weather needs a farm district with map coordinates and an OpenWeatherMap API key.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.weatherMain}>
              {weatherQuery.data.heavy_rain_warning
                ? <CloudRain color="#2267A8" size={21} />
                : <CloudSun color={colors.primary} size={21} />}
              <Text style={styles.weatherTemperature}>
                {Math.round(weatherQuery.data.temperature_c)}°C
              </Text>
              <View style={styles.weatherLocation}>
                <Text style={styles.weatherPlace}>{weatherQuery.data.location}</Text>
                <Text style={styles.weatherCondition}>{weatherQuery.data.condition}</Text>
              </View>
              <Text style={styles.rainValue}>
                {weatherQuery.data.rainfall_next_24h_mm} mm rain
              </Text>
            </View>
            {weatherQuery.data.heavy_rain_warning ? (
              <Text style={styles.rainAdvisory}>{weatherQuery.data.advisory}</Text>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Leaf color={colors.white} size={23} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Your farm, better informed</Text>
          <Text style={styles.heroText}>
            Check the latest market data or get practical crop guidance.
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Quick access</Text>
      </View>
      <View style={styles.actions}>
        {quickActions.map(({ label, Icon, route, tone }) => (
          <Pressable
            accessibilityRole="button"
            key={label}
            onPress={() => router.push(route)}
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
          >
            <View style={[styles.actionIcon, { backgroundColor: tone }]}>
              <Icon color={colors.primary} size={21} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
            <ArrowRight color="#9CA3AF" size={15} />
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Market watch</Text>
          <Text style={styles.sectionSubtitle}>Latest prices by market</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/markets')}
          style={styles.seeAll}
        >
          <Text style={styles.seeAllText}>All markets</Text>
          <ArrowRight color={colors.primary} size={15} />
        </Pressable>
      </View>

      {commoditiesQuery.isPending || loadingPrices ? (
        <LoadingState label="Loading market information..." />
      ) : commoditiesQuery.isError || priceError ? (
        <FeedbackState
          actionLabel="Try again"
          kind="error"
          message={getApiErrorMessage(commoditiesQuery.error ?? priceError)}
          onAction={refresh}
          title="Could not load market information"
        />
      ) : topCommodities.length === 0 ? (
        <FeedbackState
          message="There are no commodities available to show yet."
          title="No market data yet"
        />
      ) : (
        topCommodities.map((commodity, index) => (
          <CommodityCard
            commodity={commodity}
            key={commodity.id}
            price={priceQueries[index]?.data?.prices[0]}
          />
        ))
      )}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Use current information wisely</Text>
        <Text style={styles.noticeText}>
          Market prices are reported by the backend with their source and date.
          Availability can vary by district.
        </Text>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Active farm summary</Text>
          <Text style={styles.sectionSubtitle}>Your land and growing crops</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/farms')}
          style={styles.seeAll}
        >
          <Text style={styles.seeAllText}>Manage</Text>
          <ArrowRight color={colors.primary} size={15} />
        </Pressable>
      </View>
      {farmsQuery.isPending || cropsQuery.isPending ? (
        <LoadingState label="Loading your farm summary..." />
      ) : farmsQuery.isError || cropsQuery.isError ? (
        <FeedbackState
          actionLabel="Retry"
          kind="error"
          message={getApiErrorMessage(farmsQuery.error ?? cropsQuery.error)}
          onAction={() => {
            void farmsQuery.refetch();
            void cropsQuery.refetch();
          }}
          title="Farm summary unavailable"
        />
      ) : farmsQuery.data.results.length ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryNumber}>
                {farmsQuery.data.results
                  .reduce((total, farm) => total + Number(farm.size_acres), 0)
                  .toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>acres registered</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryNumber}>{cropsQuery.data.results.length}</Text>
              <Text style={styles.summaryLabel}>crop records</Text>
            </View>
          </View>
          <Text style={styles.summaryFootnote}>
            {cropsQuery.data.results.length
              ? `Growing: ${[...new Set(cropsQuery.data.results.map((crop) => crop.crop_type))].slice(0, 3).join(', ')}`
              : 'Add crop records to track planting and harvest stages.'}
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/farms')}
          style={styles.emptyFarmCard}
        >
          <Sprout color={colors.primary} size={21} />
          <View style={styles.emptyFarmCopy}>
            <Text style={styles.emptyFarmTitle}>Add your first farm</Text>
            <Text style={styles.emptyFarmText}>Track land area, crops, and harvest plans.</Text>
          </View>
          <ArrowRight color={colors.primary} size={16} />
        </Pressable>
      )}

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Alerts</Text>
          <Text style={styles.sectionSubtitle}>Important updates for your account</Text>
        </View>
        {notificationsQuery.data?.results.length ? (
          <Pressable
            accessibilityRole="button"
            disabled={markAllReadMutation.isPending}
            onPress={() => markAllReadMutation.mutate()}
            style={styles.seeAll}
          >
            <Text style={styles.seeAllText}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>
      {notificationsQuery.isPending ? (
        <LoadingState label="Checking your alerts..." />
      ) : notificationsQuery.isError ? (
        <FeedbackState
          actionLabel="Retry"
          kind="error"
          message={getApiErrorMessage(notificationsQuery.error)}
          onAction={() => void notificationsQuery.refetch()}
          title="Alerts unavailable"
        />
      ) : notificationsQuery.data.results.length ? (
        <View style={styles.alertList}>
          {notificationsQuery.data.results.slice(0, 3).map((notification) => (
            <Pressable
              accessibilityRole="button"
              key={notification.id}
              onPress={() => {
                markReadMutation.mutate({ id: notification.id, isRead: true });
                if (notification.action_url === '/marketplace/offers') {
                  router.push('/(tabs)/marketplace?view=offers');
                }
              }}
              style={styles.alertRow}
            >
              <View style={styles.alertIcon}>
                <Bell color={colors.primary} size={15} />
              </View>
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>{notification.title}</Text>
                <Text numberOfLines={2} style={styles.alertText}>{notification.message}</Text>
              </View>
              {!notification.is_read ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyAlerts}>
          <Text style={styles.emptyAlertText}>
            You&apos;re all caught up. New alerts will appear here.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 34 },
  topline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  greetingBlock: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  greeting: { color: colors.darkGreen, fontSize: 27, fontWeight: '900', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  avatar: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 24, height: 48, justifyContent: 'center', marginLeft: 12, width: 48 },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  weatherCard: { backgroundColor: colors.white, borderRadius: 14, marginTop: 17, padding: 13 },
  weatherMain: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  weatherError: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  weatherMessage: { color: colors.muted, flex: 1, fontSize: 10, lineHeight: 15 },
  weatherTemperature: { color: colors.darkGreen, fontSize: 21, fontWeight: '900' },
  weatherLocation: { flex: 1 },
  weatherPlace: { color: colors.text, fontSize: 12, fontWeight: '800' },
  weatherCondition: { color: colors.muted, fontSize: 10, marginTop: 3, textTransform: 'capitalize' },
  rainValue: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  rainAdvisory: { color: '#8A5A00', fontSize: 10, lineHeight: 15, marginTop: 9 },
  hero: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 20, flexDirection: 'row', gap: 13, marginTop: 24, padding: 18 },
  heroIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, height: 46, justifyContent: 'center', width: 46 },
  heroCopy: { flex: 1 },
  heroTitle: { color: colors.white, fontSize: 15, fontWeight: '800' },
  heroText: { color: '#E7F5E8', fontSize: 12, lineHeight: 18, marginTop: 5 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 27 },
  sectionTitle: { color: colors.darkGreen, fontSize: 18, fontWeight: '800' },
  sectionSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  actions: { gap: 9 },
  actionCard: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 14, flexDirection: 'row', gap: 12, minHeight: 62, paddingHorizontal: 12 },
  actionIcon: { alignItems: 'center', borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  actionLabel: { color: colors.text, flex: 1, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.82 },
  seeAll: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  seeAllText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  notice: { backgroundColor: '#FFF7E6', borderRadius: 15, marginTop: 10, padding: 14 },
  noticeTitle: { color: '#8A5A00', fontSize: 12, fontWeight: '800' },
  noticeText: { color: '#866E41', fontSize: 11, lineHeight: 17, marginTop: 4 },
  summaryCard: { backgroundColor: colors.white, borderRadius: 16, padding: 15 },
  summaryStats: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-around' },
  summaryStat: { alignItems: 'center', flex: 1 },
  summaryNumber: { color: colors.darkGreen, fontSize: 21, fontWeight: '900' },
  summaryLabel: { color: colors.muted, fontSize: 10, marginTop: 4 },
  summaryDivider: { backgroundColor: colors.border, height: 40, width: StyleSheet.hairlineWidth },
  summaryFootnote: { color: colors.muted, fontSize: 11, marginTop: 13, textAlign: 'center', textTransform: 'capitalize' },
  emptyFarmCard: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 14, flexDirection: 'row', gap: 12, minHeight: 65, paddingHorizontal: 14 },
  emptyFarmCopy: { flex: 1 },
  emptyFarmTitle: { color: colors.darkGreen, fontSize: 13, fontWeight: '800' },
  emptyFarmText: { color: colors.muted, fontSize: 11, marginTop: 4 },
  alertList: { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 14 },
  alertRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 11, minHeight: 72, paddingVertical: 11 },
  alertIcon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 11, height: 34, justifyContent: 'center', width: 34 },
  alertCopy: { flex: 1 },
  alertTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  alertText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  unreadDot: { backgroundColor: colors.primary, borderRadius: 4, height: 8, width: 8 },
  emptyAlerts: { backgroundColor: colors.white, borderRadius: 14, padding: 15 },
  emptyAlertText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
});
