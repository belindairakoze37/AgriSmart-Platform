import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react-native';
import type { Commodity, CurrentPrice } from '../services/api';
import { colors } from '../constants/theme';

interface CommodityCardProps {
  commodity: Commodity;
  price?: CurrentPrice;
  onPress?: () => void;
}

export function CommodityCard({ commodity, price, onPress }: CommodityCardProps) {
  const change = price?.change_percent;
  const positive = typeof change === 'number' && change > 0;
  const negative = typeof change === 'number' && change < 0;
  const TrendIcon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  const trendColor = positive ? colors.success : negative ? colors.error : colors.muted;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <View style={styles.mark}>
          <Text style={styles.markText}>{commodity.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.nameBlock}>
          <Text numberOfLines={1} style={styles.name}>{commodity.name}</Text>
          <Text style={styles.category}>{commodity.category} · per {commodity.unit}</Text>
          {price ? (
            <Text numberOfLines={1} style={styles.market}>
              {price.market_name}, {price.district}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        {price ? (
          <>
            <Text style={styles.price}>
              UGX {Number(price.price_per_unit).toLocaleString()}
            </Text>
            <View style={styles.change}>
              <TrendIcon color={trendColor} size={13} />
              <Text style={[styles.changeText, { color: trendColor }]}>
                {change == null
                  ? 'Latest available'
                  : `${Math.abs(change).toFixed(1)}%`}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.noPrice}>No recent price</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 14,
  },
  pressed: { opacity: 0.82 },
  left: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 11 },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.paleGreen,
    borderRadius: 13,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  markText: { color: colors.primary, fontSize: 17, fontWeight: '800' },
  nameBlock: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  category: { color: colors.muted, fontSize: 11, marginTop: 3, textTransform: 'capitalize' },
  market: { color: colors.muted, fontSize: 11, marginTop: 3 },
  right: { alignItems: 'flex-end', marginLeft: 8 },
  price: { color: colors.darkGreen, fontSize: 14, fontWeight: '800' },
  change: { alignItems: 'center', flexDirection: 'row', gap: 2, marginTop: 5 },
  changeText: { fontSize: 11, fontWeight: '700' },
  noPrice: { color: colors.muted, fontSize: 11, textAlign: 'right' },
});
