import { useQueries, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Camera,
  Leaf,
  MessageCircle,
  ShoppingBasket,
} from 'lucide-react-native';
import { useCallback } from 'react';
import {
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
import { getApiErrorMessage, marketsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const quickActions = [
  { label: 'Market prices', Icon: Leaf, route: '/(tabs)/markets', tone: '#E8F5E9' },
  { label: 'Ask an advisor', Icon: MessageCircle, route: '/(tabs)/advisory', tone: '#EAF1FF' },
  { label: 'Detect disease', Icon: Camera, route: '/diseases/detect', tone: '#FDECEC' },
  { label: 'Find produce', Icon: ShoppingBasket, route: '/(tabs)/marketplace', tone: '#FFF4E5' },
] as const;

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
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
  const refresh = useCallback(() => {
    void commoditiesQuery.refetch();
    priceQueries.forEach((query) => {
      if (query.refetch) void query.refetch();
    });
  }, [commoditiesQuery, priceQueries]);

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
});
