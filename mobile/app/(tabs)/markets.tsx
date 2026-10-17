import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { CommodityCard } from '../../components/CommodityCard';
import { FeedbackState } from '../../components/FeedbackState';
import { LoadingState } from '../../components/LoadingState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/theme';
import {
  getApiErrorMessage,
  getNextPage,
  marketsApi,
  type CurrentPrice,
} from '../../services/api';

export default function MarketsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const commoditiesQuery = useQuery({
    queryKey: ['markets', 'commodities'],
    queryFn: async () => (await marketsApi.getCommodities()).data,
  });
  const pricesQuery = useInfiniteQuery({
    queryKey: ['markets', 'prices'],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => (await marketsApi.getPrices(pageParam)).data,
    getNextPageParam: getNextPage,
  });

  const latestPrices = useMemo(() => {
    const byCommodity = new Map<string, CurrentPrice>();
    for (const page of pricesQuery.data?.pages ?? []) {
      for (const price of page.results) {
        if (!byCommodity.has(price.commodity)) {
          byCommodity.set(price.commodity, {
            market_id: price.market,
            market_name: price.market_name,
            district: price.district_name,
            latitude: null,
            longitude: null,
            price_per_unit: Number(price.price_per_unit),
            unit: price.unit,
            recorded_date: price.recorded_date,
            change_percent: null,
            source: price.source,
          });
        }
      }
    }
    return byCommodity;
  }, [pricesQuery.data]);

  const commodities = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return (commoditiesQuery.data ?? []).filter((commodity) =>
      commodity.name.toLocaleLowerCase().includes(normalizedSearch),
    );
  }, [commoditiesQuery.data, search]);

  const refresh = () => {
    void commoditiesQuery.refetch();
    void pricesQuery.refetch();
  };

  if (commoditiesQuery.isPending || pricesQuery.isPending) {
    return (
      <View style={styles.fill}>
        <LoadingState label="Loading commodities and prices..." />
      </View>
    );
  }

  if (commoditiesQuery.isError) {
    return (
      <View style={styles.fill}>
        <FeedbackState
          actionLabel="Try again"
          kind="error"
          message={getApiErrorMessage(commoditiesQuery.error)}
          onAction={refresh}
          title="Could not load commodities"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F9F4]" style={styles.fill}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={commodities}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <FeedbackState
            message={
              search
                ? 'Try another commodity name.'
                : 'No commodities are available right now.'
            }
            title={search ? 'No matches found' : 'No market data yet'}
          />
        }
        ListFooterComponent={
          pricesQuery.isError && pricesQuery.data?.pages.length ? (
            <FeedbackState
              actionLabel="Retry prices"
              kind="error"
              message={getApiErrorMessage(pricesQuery.error)}
              onAction={() => void pricesQuery.refetch()}
              title="Price information is unavailable"
            />
          ) : pricesQuery.isFetchingNextPage ? (
            <LoadingState label="Loading more price records..." />
          ) : null
        }
        ListHeaderComponent={
          <View>
            <ScreenHeader
              eyebrow="LOCAL MARKET INFORMATION"
              subtitle="Commodity prices reported across available markets."
              title="Markets"
            />
            <View style={styles.searchBox}>
              <Search color={colors.muted} size={19} />
              <TextInput
                accessibilityLabel="Search commodities"
                autoCapitalize="none"
                onChangeText={setSearch}
                placeholder="Search commodities"
                placeholderTextColor="#9CA3AF"
                returnKeyType="search"
                style={styles.searchInput}
                value={search}
              />
            </View>
            {pricesQuery.isError && !pricesQuery.data?.pages.length ? (
              <View style={styles.inlineError}>
                <FeedbackState
                  actionLabel="Retry prices"
                  kind="error"
                  message={getApiErrorMessage(pricesQuery.error)}
                  onAction={() => void pricesQuery.refetch()}
                  title="Could not fetch current price records"
                />
              </View>
            ) : null}
          </View>
        }
        onEndReached={() => {
          if (pricesQuery.hasNextPage && !pricesQuery.isFetchingNextPage) {
            void pricesQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={refresh}
            refreshing={commoditiesQuery.isRefetching || pricesQuery.isRefetching}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <CommodityCard
            commodity={item}
            onPress={() => router.push(`/markets/${item.id}`)}
            price={latestPrices.get(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: colors.background, flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
    paddingHorizontal: 14,
  },
  searchInput: { color: colors.text, flex: 1, fontSize: 14, minHeight: 49 },
  inlineError: { marginBottom: 14 },
});
