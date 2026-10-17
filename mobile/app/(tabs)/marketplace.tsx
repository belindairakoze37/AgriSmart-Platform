import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Plus, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { FeedbackState } from '../../components/FeedbackState';
import { ListingCard } from '../../components/ListingCard';
import { LoadingState } from '../../components/LoadingState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/theme';
import {
  getApiErrorMessage,
  getNextPage,
  marketplaceApi,
  type Offer,
} from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function MarketplaceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const params = useLocalSearchParams<{ view?: string }>();
  const view = params.view === 'mine' || params.view === 'offers' ? params.view : 'browse';
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
    enabled: view !== 'offers',
  });
  const offersQuery = useInfiniteQuery({
    queryKey: ['marketplace', 'offers'],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => (await marketplaceApi.getOffers(pageParam)).data,
    getNextPageParam: getNextPage,
    enabled: view === 'offers',
  });
  const offerMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) =>
      marketplaceApi.updateOfferStatus(id, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['marketplace', 'offers'] }),
        queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] }),
      ]);
    },
    onError: (error: unknown) =>
      Alert.alert('Offer update failed', getApiErrorMessage(error)),
  });
  const listings = useMemo(
    () => listingsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [listingsQuery.data],
  );
  const offers = useMemo(
    () => offersQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [offersQuery.data],
  );

  if (view === 'offers') {
    if (offersQuery.isPending) {
      return <View style={styles.fill}><LoadingState label="Loading offers..." /></View>;
    }
    if (offersQuery.isError && offers.length === 0) {
      return (
        <View style={styles.fill}>
          <FeedbackState
            actionLabel="Try again"
            kind="error"
            message={getApiErrorMessage(offersQuery.error)}
            onAction={() => void offersQuery.refetch()}
            title="Offers unavailable"
          />
        </View>
      );
    }
    return (
      <View style={styles.fill}>
        <FlatList
          contentContainerStyle={styles.list}
          data={offers}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <FeedbackState
              message="Offers you make and offers received on your listings appear here."
              title="No offers yet"
            />
          }
          ListFooterComponent={
            offersQuery.hasNextPage ? (
              <Pressable
                accessibilityRole="button"
                disabled={offersQuery.isFetchingNextPage}
                onPress={() => void offersQuery.fetchNextPage()}
                style={styles.moreButton}
              >
                <Text style={styles.moreButtonText}>
                  {offersQuery.isFetchingNextPage ? 'Loading offers...' : 'Load more offers'}
                </Text>
              </Pressable>
            ) : null
          }
          ListHeaderComponent={
            <View>
              <ScreenHeader
                eyebrow="BUY AND SELL PRODUCE"
                subtitle="Track offers you made and offers received by your listings."
                title="Marketplace offers"
              />
              <MarketplaceSegments
                currentView={view}
                onChange={(nextView) => goToView(router, nextView)}
              />
              {offerMutation.isError ? (
                <Text style={styles.inlineError}>
                  {getApiErrorMessage(offerMutation.error)}
                </Text>
              ) : null}
              <Text style={styles.resultCount}>
                {offersQuery.data?.pages[0]?.count ?? 0} offers on your account
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              colors={[colors.primary]}
              onRefresh={() => void offersQuery.refetch()}
              refreshing={offersQuery.isRefetching}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              isBuyer={item.buyer === user?.id}
              isBusy={offerMutation.isPending}
              onUpdate={(status) => {
                Alert.alert(
                  status === 'accepted' ? 'Accept this offer?' : 'Reject this offer?',
                  status === 'accepted'
                    ? 'This records the transaction and marks the listing as sold. Payment is not processed in AgriSmart.'
                    : 'The buyer will be notified that the offer was rejected.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: status === 'accepted' ? 'Accept offer' : 'Reject offer',
                      style: status === 'rejected' ? 'destructive' : 'default',
                      onPress: () => offerMutation.mutate({ id: item.id, status }),
                    },
                  ],
                );
              }}
            />
          )}
        />
      </View>
    );
  }

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
            <MarketplaceSegments
              currentView={view}
              onChange={(nextView) => goToView(router, nextView)}
            />
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

type MarketplaceView = 'browse' | 'mine' | 'offers';

function goToView(router: ReturnType<typeof useRouter>, view: MarketplaceView) {
  router.replace(
    view === 'browse'
      ? '/(tabs)/marketplace'
      : `/(tabs)/marketplace?view=${view}`,
  );
}

function MarketplaceSegments({
  currentView,
  onChange,
}: {
  currentView: MarketplaceView;
  onChange: (view: MarketplaceView) => void;
}) {
  return (
    <View style={styles.segment}>
      {(['browse', 'mine', 'offers'] as const).map((option) => {
        const selected = currentView === option;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option}
            onPress={() => onChange(option)}
            style={[styles.segmentButton, selected && styles.selectedSegment]}
          >
            <Text style={[styles.segmentText, selected && styles.selectedSegmentText]}>
              {option === 'browse' ? 'Browse' : option === 'mine' ? 'My listings' : 'Offers'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function OfferCard({
  offer,
  isBuyer,
  isBusy,
  onUpdate,
}: {
  offer: Offer;
  isBuyer: boolean;
  isBusy: boolean;
  onUpdate: (status: 'accepted' | 'rejected') => void;
}) {
  return (
    <View style={styles.offerCard}>
      <View style={styles.offerHead}>
        <Text style={styles.offerName}>{offer.listing_title}</Text>
        <Text style={[styles.offerStatus, offer.status === 'accepted' && styles.acceptedStatus]}>
          {offer.status}
        </Text>
      </View>
      <Text style={styles.offerMeta}>
        {isBuyer ? 'Your offer' : `From ${offer.buyer_name || offer.buyer_phone}`}
      </Text>
      <Text style={styles.offerPrice}>
        UGX {Number(offer.offered_price_per_kg).toLocaleString()}/kg
        <Text style={styles.offerMeta}>  ·  {Number(offer.quantity_kg).toLocaleString()} kg</Text>
      </Text>
      {offer.message ? <Text style={styles.offerMessage}>{offer.message}</Text> : null}
      {!isBuyer && offer.status === 'pending' ? (
        <View style={styles.offerActions}>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => onUpdate('accepted')}
            style={[styles.acceptButton, isBusy && styles.disabled]}
          >
            <Check color={colors.white} size={15} />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => onUpdate('rejected')}
            style={[styles.rejectButton, isBusy && styles.disabled]}
          >
            <X color={colors.error} size={15} />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
        </View>
      ) : null}
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
  moreButton: { alignItems: 'center', minHeight: 46, justifyContent: 'center' },
  moreButtonText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  resultCount: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 12, marginTop: 18 },
  inlineError: { color: colors.error, fontSize: 12, lineHeight: 17, marginTop: 10 },
  createButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 11, minHeight: 46 },
  createButtonText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  offerCard: { backgroundColor: colors.white, borderRadius: 15, gap: 7, marginBottom: 11, padding: 15 },
  offerHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  offerName: { color: colors.darkGreen, flex: 1, fontSize: 14, fontWeight: '800', marginRight: 8 },
  offerStatus: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  acceptedStatus: { color: colors.primary },
  offerMeta: { color: colors.muted, fontSize: 11 },
  offerPrice: { color: colors.text, fontSize: 14, fontWeight: '800' },
  offerMessage: { color: colors.text, fontSize: 12, lineHeight: 17, marginTop: 3 },
  offerActions: { flexDirection: 'row', gap: 9, marginTop: 7 },
  acceptButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 10, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 40, flex: 1 },
  acceptButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  rejectButton: { alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 40, flex: 1 },
  rejectButtonText: { color: colors.error, fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
});
