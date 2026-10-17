import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useState } from 'react';
import { MapPin, Package, UserRound } from 'lucide-react-native';
import { FormInput } from '../../components/FormInput';
import { FeedbackState } from '../../components/FeedbackState';
import { LoadingState } from '../../components/LoadingState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../constants/theme';
import { getApiErrorMessage, marketplaceApi } from '../../services/api';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const listingQuery = useQuery({
    queryKey: ['marketplace', 'listing', id],
    queryFn: async () => (await marketplaceApi.getListing(id)).data,
    enabled: Boolean(id),
  });
  const offerMutation = useMutation({
    mutationFn: () => {
      const offeredPrice = Number(price);
      const offeredQuantity = Number(quantity);
      if (!Number.isFinite(offeredPrice) || offeredPrice <= 0) {
        throw new Error('Enter a valid offer price per kilogram.');
      }
      if (
        !Number.isFinite(offeredQuantity) ||
        offeredQuantity <= 0 ||
        offeredQuantity > Number(listingQuery.data?.quantity_kg)
      ) {
        throw new Error('Enter a quantity that is available in this listing.');
      }
      return marketplaceApi.createOffer({
        listing: id,
        offered_price_per_kg: offeredPrice,
        quantity_kg: offeredQuantity,
        ...(message.trim() ? { message: message.trim() } : {}),
      });
    },
    onSuccess: () => {
      setFormError('');
      setPrice('');
      setQuantity('');
      setMessage('');
      Alert.alert(
        'Offer sent',
        'Your offer has been submitted. The farmer can review it in AgriSmart.',
      );
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  });

  if (listingQuery.isPending) return <LoadingState label="Loading listing..." />;
  if (listingQuery.isError || !listingQuery.data) {
    return (
      <View style={styles.center}>
        <FeedbackState
          actionLabel="Try again"
          kind="error"
          message={getApiErrorMessage(listingQuery.error)}
          onAction={() => void listingQuery.refetch()}
          title="Listing could not be opened"
        />
      </View>
    );
  }

  const listing = listingQuery.data;
  const image = Array.isArray(listing.images)
    ? listing.images.find(
        (item) =>
          typeof item === 'string' &&
          (item.startsWith('https://') || item.startsWith('http://')),
      )
    : undefined;

  return (
    <ScrollView
      className="flex-1 bg-[#F5F9F4]"
      contentContainerStyle={styles.content}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.heroImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Package color={colors.primary} size={38} />
          <Text style={styles.imagePlaceholderText}>Produce listing</Text>
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{listing.commodity_name.toUpperCase()}</Text>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>
          UGX {Number(listing.expected_price_per_kg).toLocaleString()}
          <Text style={styles.perUnit}> / kg</Text>
        </Text>

        <View style={styles.facts}>
          <Fact icon="package" label="Available quantity" value={`${listing.quantity_kg} kg`} />
          <Fact icon="map" label="District" value={listing.district_name} />
          <Fact icon="seller" label="Farmer" value={listing.farmer_name || 'Farmer'} />
          <Fact icon="package" label="Quality grade" value={`Grade ${listing.quality_grade}`} />
        </View>
        {listing.pickup_location ? (
          <View style={styles.pickup}>
            <MapPin color={colors.primary} size={17} />
            <Text style={styles.pickupText}>{listing.pickup_location}</Text>
          </View>
        ) : null}
        {listing.description ? (
          <>
            <Text style={styles.sectionTitle}>About this produce</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </>
        ) : null}
        {listing.is_demo ? (
          <View style={styles.sampleNote}>
            <Text style={styles.sampleTitle}>Sample listing</Text>
            <Text style={styles.offerNote}>
              This example is for demonstration only and is not available to buy.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Send an offer</Text>
            <Text style={styles.offerNote}>
              This submits an offer for the farmer to review. No payment is taken in the app.
            </Text>
            <View style={styles.fields}>
              <FormInput
                keyboardType="decimal-pad"
                label="Your price per kg (UGX)"
                onChangeText={setPrice}
                placeholder="e.g. 2500"
                value={price}
              />
              <FormInput
                keyboardType="decimal-pad"
                label="Quantity (kg)"
                onChangeText={setQuantity}
                placeholder={`Up to ${listing.quantity_kg} kg`}
                value={quantity}
              />
              <FormInput
                label="Message (optional)"
                multiline
                onChangeText={setMessage}
                placeholder="Add a note for the farmer"
                textAlignVertical="top"
                value={message}
              />
            </View>
            {formError ? (
              <Text accessibilityRole="alert" style={styles.error}>{formError}</Text>
            ) : null}
            <PrimaryButton
              loading={offerMutation.isPending}
              onPress={() => {
                setFormError('');
                offerMutation.mutate();
              }}
            >
              Send offer
            </PrimaryButton>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: 'package' | 'map' | 'seller';
  label: string;
  value: string;
}) {
  const Icon = icon === 'map' ? MapPin : icon === 'seller' ? UserRound : Package;
  return (
    <View style={styles.fact}>
      <Icon color={colors.primary} size={17} />
      <View style={styles.factCopy}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 20 },
  content: { paddingBottom: 32 },
  heroImage: { height: 240, width: '100%' },
  imagePlaceholder: { alignItems: 'center', backgroundColor: colors.paleGreen, height: 210, justifyContent: 'center' },
  imagePlaceholderText: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 8 },
  card: { backgroundColor: colors.white, borderRadius: 22, margin: 16, padding: 19 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.darkGreen, fontSize: 24, fontWeight: '900', marginTop: 6 },
  price: { color: colors.primary, fontSize: 21, fontWeight: '900', marginTop: 11 },
  perUnit: { color: colors.muted, fontSize: 13, fontWeight: '500' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginTop: 22 },
  fact: { alignItems: 'center', flexDirection: 'row', gap: 9, minWidth: '45%' },
  factCopy: { flex: 1 },
  factLabel: { color: colors.muted, fontSize: 10 },
  factValue: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 3 },
  pickup: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 12, flexDirection: 'row', gap: 8, marginTop: 18, padding: 12 },
  pickupText: { color: colors.darkGreen, flex: 1, fontSize: 12 },
  sectionTitle: { color: colors.darkGreen, fontSize: 16, fontWeight: '800', marginTop: 24 },
  description: { color: colors.text, fontSize: 13, lineHeight: 20, marginTop: 7 },
  offerNote: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  fields: { gap: 14, marginVertical: 16 },
  error: { color: colors.error, fontSize: 12, marginBottom: 12 },
  sampleNote: { backgroundColor: colors.paleGreen, borderRadius: 12, marginTop: 20, padding: 14 },
  sampleTitle: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});
