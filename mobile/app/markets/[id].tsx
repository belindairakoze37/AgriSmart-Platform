import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CommodityCard } from '../../components/CommodityCard';
import { FeedbackState } from '../../components/FeedbackState';
import { LoadingState } from '../../components/LoadingState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/theme';
import { getApiErrorMessage, marketsApi } from '../../services/api';

export default function CommodityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commodityQuery = useQuery({
    queryKey: ['markets', 'commodities'],
    queryFn: async () => (await marketsApi.getCommodities()).data,
  });
  const commodity = commodityQuery.data?.find((item) => item.id === id);
  const pricesQuery = useQuery({
    queryKey: ['markets', 'current-price', id],
    queryFn: async () => (await marketsApi.getCurrentPrices(id, 10)).data,
    enabled: Boolean(id),
  });
  const historyQuery = useQuery({
    queryKey: ['markets', 'price-history', id],
    queryFn: async () => (await marketsApi.getPriceHistory(id)).data,
    enabled: Boolean(id),
  });

  if (commodityQuery.isPending || pricesQuery.isPending || historyQuery.isPending) {
    return <LoadingState label="Loading commodity information..." />;
  }
  if (commodityQuery.isError || pricesQuery.isError || historyQuery.isError) {
    const error =
      commodityQuery.error ?? pricesQuery.error ?? historyQuery.error;
    return (
      <View style={styles.center}>
        <FeedbackState
          actionLabel="Try again"
          kind="error"
          message={getApiErrorMessage(error)}
          onAction={() => {
            void commodityQuery.refetch();
            void pricesQuery.refetch();
            void historyQuery.refetch();
          }}
          title="Could not load commodity data"
        />
      </View>
    );
  }
  if (!commodity) {
    return (
      <View style={styles.center}>
        <FeedbackState
          message="This commodity is no longer available."
          title="Commodity not found"
        />
      </View>
    );
  }

  const prices = pricesQuery.data?.prices ?? [];
  const history = historyQuery.data?.data ?? [];

  return (
    <ScrollView className="flex-1 bg-[#F5F9F4]" contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow={commodity.category}
        subtitle={`Market price history · per ${commodity.unit}`}
        title={commodity.name}
      />
      <Text style={styles.sectionTitle}>Latest available prices</Text>
      {prices.length === 0 ? (
        <FeedbackState
          message="No price records are currently available for this commodity."
          title="No recent prices"
        />
      ) : (
        prices.map((price) => (
          <CommodityCard
            commodity={commodity}
            key={`${price.market_id}-${price.recorded_date}`}
            price={price}
          />
        ))
      )}

      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Weekly price history</Text>
        <Pressable
          accessibilityLabel="Refresh price history"
          accessibilityRole="button"
          onPress={() => void historyQuery.refetch()}
          style={styles.refresh}
        >
          <RefreshCw color={colors.primary} size={16} />
        </Pressable>
      </View>
      {history.length === 0 ? (
        <FeedbackState
          message="No historical records were returned for the selected period."
          title="History not available"
        />
      ) : (
        <View style={styles.historyCard}>
          {history.map((entry, index) => (
            <View
              key={`${entry.date ?? 'week'}-${index}`}
              style={[styles.historyRow, index === history.length - 1 && styles.lastHistoryRow]}
            >
              <View>
                <Text style={styles.historyDate}>
                  {entry.date
                    ? new Date(entry.date).toLocaleDateString()
                    : 'Week not specified'}
                </Text>
                <Text style={styles.samples}>{entry.sample_count} market records</Text>
              </View>
              <View style={styles.historyNumbers}>
                <Text style={styles.average}>
                  {entry.avg_price == null
                    ? '—'
                    : `UGX ${entry.avg_price.toLocaleString()}`}
                </Text>
                <Text style={styles.range}>
                  Low {entry.min_price?.toLocaleString() ?? '—'} · High{' '}
                  {entry.max_price?.toLocaleString() ?? '—'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.disclaimer}>
        Prices reflect records returned by the market service. Confirm availability and grade directly with the market.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'stretch', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 20 },
  content: { padding: 20, paddingBottom: 34 },
  sectionTitle: { color: colors.darkGreen, fontSize: 16, fontWeight: '800', marginBottom: 12, marginTop: 9 },
  historyHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  refresh: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  historyCard: { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 14 },
  historyRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  lastHistoryRow: { borderBottomWidth: 0 },
  historyDate: { color: colors.text, fontSize: 12, fontWeight: '700' },
  samples: { color: colors.muted, fontSize: 10, marginTop: 4 },
  historyNumbers: { alignItems: 'flex-end' },
  average: { color: colors.darkGreen, fontSize: 13, fontWeight: '800' },
  range: { color: colors.muted, fontSize: 9, marginTop: 4 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 18 },
});
