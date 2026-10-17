import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FeedbackState } from '../../components/FeedbackState';
import { ListingCard } from '../../components/ListingCard';
import { LoadingState } from '../../components/LoadingState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/theme';
import {
  getApiErrorMessage,
  getNextPage,
  marketplaceApi,
} from '../../services/api';

export default function MarketplaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string }>();
  const view = params.view === 'mine' ? 'mine' : 'browse';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const listingsQuery = useInfiniteQuery({
    queryKey: ['marketplace', 'listings', view, view === 'browse' ? debouncedSearch : ''],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await (view === 'mine'
          ? marketplaceApi.getMyListings(pageParam)
          : marketplaceApi.getListings(pageParam, debouncedSearch))
      ).data,
    getNextPageParam: getNextPage,
  });
  const listings = useMemo(
    () => listingsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [listingsQuery.data],
  );
  if (listingsQuery.isPending) {
    return (
      <View style={styles.fill}>
        <LoadingState label="Loading produce listings..." />
      </View>
    );
  }

  if (listingsQuery.isError && listings.length === 0) {
    return (
      <View style={styles.fill}>
        <FeedbackState
          actionLabel="Try again"
          kind="error"
          message={getApiErrorMessage(listingsQuery.error)}
          onAction={() => void listingsQuery.refetch()}
          title="Marketplace unavailable"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F9F4]" style={styles.fill}>
      <FlatList
        contentContainerStyle={styles.list}
        data={listings}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          listingsQuery.isError ? (
            <FeedbackState
              actionLabel="Retry"
              kind="error"
              message={getApiErrorMessage(listingsQuery.error)}
              onAction={() => void listingsQuery.refetch()}
              title="Could not load listings"
            />
          ) : (
            <FeedbackState
              message={
                view === 'mine'
                  ? 'Your published listings will appear here.'
                  : search
                    ? 'Try another listing title or description.'
                    : 'There are no active produce listings to display right now.'
              }
              title={
                view === 'mine'
                  ? 'No listings yet'
                  : search
                    ? 'No listings match'
                    : 'Marketplace is quiet'
              }
            />
          )
        }
        ListFooterComponent={
          listingsQuery.isFetchingNextPage ? (
            <LoadingState label="Loading more listings..." />
          ) : listingsQuery.isError && listings.length > 0 ? (
            <FeedbackState
              actionLabel="Retry"
              kind="error"
              message={getApiErrorMessage(listingsQuery.error)}
              onAction={() => void listingsQuery.fetchNextPage()}
              title="Could not load more listings"
            />
          ) : null
        }
        ListHeaderComponent={
          <View>
            <ScreenHeader
              eyebrow={view === 'mine' ? 'YOUR PRODUCE' : 'BUY AND SELL PRODUCE'}
              subtitle={
                view === 'mine'
                  ? 'Manage the listings you have published.'
                  : 'Browse active offers from farmers in the marketplace.'
              }
              title={view === 'mine' ? 'My listings' : 'Marketplace'}
            />
            <View style={styles.segment}>
              {(['browse', 'mine'] as const).map((option) => {
                const selected = view === option;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option}
                    onPress={() => {
                      router.replace(
                        option === 'mine'
                          ? '/(tabs)/marketplace?view=mine'
                          : '/(tabs)/marketplace',
                      );
                    }}
                    style={[styles.segmentButton, selected && styles.selectedSegment]}
                  >
                    <Text style={[styles.segmentText, selected && styles.selectedSegmentText]}>
                      {option === 'browse' ? 'Browse' : 'My listings'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {view === 'browse' ? (
              <View style={styles.searchBox}>
                <Search color={colors.muted} size={19} />
                <TextInput
                  accessibilityLabel="Search listings"
                  autoCapitalize="none"
                  onChangeText={setSearch}
                  placeholder="Search listing title or description"
                  placeholderTextColor="#9CA3AF"
                  style={styles.search}
                  value={search}
                />
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/marketplace/create')}
              style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
            >
              <Plus color={colors.white} size={18} />
              <Text style={styles.createButtonText}>Create a listing</Text>
            </Pressable>
            {listingsQuery.isError && listings.length > 0 ? (
              <Text style={styles.inlineError}>
                Could not retrieve the next page. Existing listings are still shown.
              </Text>
            ) : null}
            <Text style={styles.resultCount}>
              {listingsQuery.data?.pages[0]?.count ?? 0}{' '}
              {view === 'mine' ? 'your listings' : 'active listings'}
            </Text>
          </View>
        }
        onEndReached={() => {
          if (listingsQuery.hasNextPage && !listingsQuery.isFetchingNextPage) {
            void listingsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void listingsQuery.refetch()}
            refreshing={listingsQuery.isRefetching}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={() => router.push(`/marketplace/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: colors.background, flex: 1 },
  list: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  searchBox: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 14 },
  search: { color: colors.text, flex: 1, fontSize: 14, minHeight: 49 },
  segment: { backgroundColor: '#E5EEE4', borderRadius: 13, flexDirection: 'row', gap: 4, marginBottom: 10, padding: 4 },
  segmentButton: { alignItems: 'center', borderRadius: 10, flex: 1, justifyContent: 'center', minHeight: 39 },
  selectedSegment: { backgroundColor: colors.white },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  selectedSegmentText: { color: colors.darkGreen },
  resultCount: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 12, marginTop: 18 },
  inlineError: { color: colors.error, fontSize: 12, lineHeight: 17, marginTop: 10 },
  createButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 11, minHeight: 46 },
  createButtonText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.82 },
});
