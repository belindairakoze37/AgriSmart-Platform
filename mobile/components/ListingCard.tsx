import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, Package } from 'lucide-react-native';
import type { Listing } from '../services/api';
import { colors } from '../constants/theme';

export function ListingCard({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress: () => void;
}) {
  const image = listing.images.find((item) => item.startsWith('https://') || item.startsWith('http://'));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${listing.title}, ${listing.commodity_name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Package color={colors.primary} size={30} />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>{listing.title}</Text>
          <Text style={styles.grade}>Grade {listing.quality_grade}</Text>
        </View>
        <Text style={styles.commodity}>{listing.commodity_name} · {listing.quantity_kg} kg</Text>
        <View style={styles.bottomRow}>
          <View style={styles.location}>
            <MapPin color={colors.muted} size={14} />
            <Text numberOfLines={1} style={styles.locationText}>{listing.district_name}</Text>
          </View>
          <Text style={styles.price}>
            UGX {Number(listing.expected_price_per_kg).toLocaleString()}/kg
          </Text>
        </View>
        <Text style={styles.seller}>Listed by {listing.farmer_name || 'Farmer'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 18, marginBottom: 14, overflow: 'hidden' },
  pressed: { opacity: 0.82 },
  image: { height: 150, width: '100%' },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.paleGreen,
    height: 118,
    justifyContent: 'center',
  },
  content: { padding: 14 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  title: { color: colors.text, flex: 1, fontSize: 16, fontWeight: '800' },
  grade: { backgroundColor: '#F3F4F6', borderRadius: 9, color: colors.muted, fontSize: 10, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  commodity: { color: colors.muted, fontSize: 13, marginTop: 5 },
  bottomRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  location: { alignItems: 'center', flexDirection: 'row', flex: 1, gap: 4 },
  locationText: { color: colors.muted, flexShrink: 1, fontSize: 12 },
  price: { color: colors.darkGreen, fontSize: 14, fontWeight: '800' },
  seller: { color: colors.muted, fontSize: 11, marginTop: 9 },
});
