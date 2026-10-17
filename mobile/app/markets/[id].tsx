import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Bell, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { CommodityCard } from '../../components/CommodityCard';
import { FeedbackState } from '../../components/FeedbackState';
import { LoadingState } from '../../components/LoadingState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/theme';
import { forecastsApi, getApiErrorMessage, marketsApi } from '../../services/api';

export default function CommodityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [alertPrice, setAlertPrice] = useState('');
  const [alertError, setAlertError] = useState('');
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
    queryKey: ['markets', 'price-history', id, 6],
    queryFn: async () => (await marketsApi.getPriceHistory(id, 6)).data,
    enabled: Boolean(id),
  });
  const forecastQuery = useQuery({
    queryKey: ['markets', 'forecast', id, 4],
    queryFn: async () => (await forecastsApi.generate(id, 4)).data,
    enabled: Boolean(id),
    staleTime: 30 * 60_000,
    retry: false,
  });
  const alertsQuery = useQuery({
    queryKey: ['markets', 'price-alerts'],
    queryFn: async () => (await marketsApi.getPriceAlerts()).data,
  });
  const activeAlert = alertsQuery.data?.results.find(
    (alert) => alert.commodity === id && alert.is_active,
  );
  const alertMutation = useMutation({
    mutationFn: () =>
      activeAlert
        ? marketsApi.updatePriceAlert(activeAlert.id, false)
        : marketsApi.createPriceAlert({
            commodity: id,
            target_price: Number(alertPrice),
            condition: 'above',
          }),
    onSuccess: async () => {
      setAlertPrice('');
      setAlertError('');
      await queryClient.invalidateQueries({ queryKey: ['markets', 'price-alerts'] });
    },
    onError: (error: unknown) => setAlertError(getApiErrorMessage(error)),
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
  const historyValues = history
    .map((item) => item.avg_price)
    .filter((value): value is number => value !== null);

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

      <Text style={styles.sectionTitle}>Six-month price trend</Text>
      {historyValues.length > 1 ? (
        <PriceHistoryChart values={historyValues} />
      ) : (
        <Text style={styles.emptyCopy}>More market records are needed to chart a trend.</Text>
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

      <View style={styles.featureCard}>
        <View style={styles.featureHeading}>
          <View style={styles.featureIcon}><Bell color={colors.primary} size={17} /></View>
          <View style={styles.featureCopy}>
            <Text style={styles.featureTitle}>Price alert</Text>
            <Text style={styles.featureDescription}>
              {activeAlert
                ? `Notify me when price goes above UGX ${Number(activeAlert.target_price).toLocaleString()}/kg`
                : 'Get an in-app alert when the latest reported price crosses your target.'}
            </Text>
          </View>
        </View>
        {!activeAlert ? (
          <TextInput
            accessibilityLabel="Alert price in UGX per kilogram"
            keyboardType="decimal-pad"
            onChangeText={setAlertPrice}
            placeholder="Target price (UGX/kg)"
            placeholderTextColor="#9CA3AF"
            style={styles.alertInput}
            value={alertPrice}
          />
        ) : null}
        {alertsQuery.isError ? (
          <Text style={styles.inlineError}>Price alerts could not be loaded: {getApiErrorMessage(alertsQuery.error)}</Text>
        ) : null}
        {alertError ? <Text style={styles.inlineError}>{alertError}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={alertMutation.isPending || alertsQuery.isPending || (!activeAlert && Number(alertPrice) <= 0)}
          onPress={() => alertMutation.mutate()}
          style={[styles.alertButton, alertMutation.isPending && styles.disabled]}
        >
          <Text style={styles.alertButtonText}>
            {alertMutation.isPending
              ? 'Saving…'
              : activeAlert
                ? 'Turn off alert'
                : 'Notify me above this price'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.featureCard}>
        <Text style={styles.featureTitle}>Four-week AI price forecast</Text>
        {forecastQuery.isPending ? (
          <Text style={styles.emptyCopy}>Preparing a forecast from recent market records…</Text>
        ) : forecastQuery.isError ? (
          <Text style={styles.emptyCopy}>
            Forecast unavailable: {getApiErrorMessage(forecastQuery.error)}
          </Text>
        ) : forecastQuery.data.forecasts.length === 0 ? (
          <Text style={styles.emptyCopy}>No forecast records are available yet.</Text>
        ) : (
          <>
            {forecastQuery.data.forecasts.slice(0, 4).map((forecast) => (
              <View key={forecast.id} style={styles.forecastRow}>
                <Text style={styles.forecastDate}>
                  {new Date(forecast.target_date).toLocaleDateString()}
                </Text>
                <View style={styles.forecastValues}>
                  <Text style={styles.forecastPrice}>
                    UGX {Number(forecast.predicted_price).toLocaleString()}
                  </Text>
                  <Text style={styles.forecastRange}>
                    Range {Number(forecast.lower_bound).toLocaleString()}–{Number(forecast.upper_bound).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.confidence}>
                  {Math.round(forecast.confidence * 100)}%
                </Text>
              </View>
            ))}
            <Text style={styles.disclaimer}>
              {forecastQuery.data.disclaimer ?? 'Forecasts use historical data and are not guaranteed. Actual prices may vary.'}
            </Text>
          </>
        )}
      </View>

      <Text style={styles.disclaimer}>
        Prices reflect records returned by the market service. Confirm availability and grade directly with the market.
      </Text>
    </ScrollView>
  );
}

function PriceHistoryChart({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 160 : 10 + index * (300 / (values.length - 1));
      const y = 100 - ((value - min) / range) * 82;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <View accessibilityLabel="Price trend chart" style={styles.chartCard}>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>UGX {max.toLocaleString()}</Text>
        <Text style={styles.chartLabel}>UGX {min.toLocaleString()}</Text>
      </View>
      <Svg height={120} viewBox="0 0 320 120" width="100%">
        <Line stroke={colors.border} strokeWidth="1" x1="8" x2="312" y1="18" y2="18" />
        <Line stroke={colors.border} strokeWidth="1" x1="8" x2="312" y1="100" y2="100" />
        <Polyline fill="none" points={points} stroke={colors.primary} strokeWidth="3" />
      </Svg>
      <Text style={styles.chartCaption}>Weekly average price · last 6 months</Text>
    </View>
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
  chartCard: { backgroundColor: colors.white, borderRadius: 16, marginBottom: 12, padding: 13 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  chartCaption: { color: colors.muted, fontSize: 10, marginTop: 3, textAlign: 'center' },
  emptyCopy: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  featureCard: { backgroundColor: colors.white, borderRadius: 16, gap: 12, marginTop: 17, padding: 15 },
  featureHeading: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  featureIcon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  featureCopy: { flex: 1 },
  featureTitle: { color: colors.darkGreen, fontSize: 15, fontWeight: '800' },
  featureDescription: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  alertInput: { borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, minHeight: 45, paddingHorizontal: 12 },
  alertButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 11, justifyContent: 'center', minHeight: 43 },
  alertButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  inlineError: { color: colors.error, fontSize: 11, lineHeight: 16 },
  disabled: { opacity: 0.5 },
  forecastRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  forecastDate: { color: colors.text, fontSize: 11, fontWeight: '700' },
  forecastValues: { alignItems: 'flex-end' },
  forecastPrice: { color: colors.darkGreen, fontSize: 12, fontWeight: '800' },
  forecastRange: { color: colors.muted, fontSize: 9, marginTop: 3 },
  confidence: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 18 },
});
