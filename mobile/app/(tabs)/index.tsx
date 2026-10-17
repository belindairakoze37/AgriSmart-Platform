import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { marketsApi, forecastsApi } from '../../services/api';

interface PriceData {
  market_name: string;
  price_per_unit: number;
  change_percent: number | null;
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [commodities, setCommodities] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [refreshing, setRefreshing] = useState(false);
  
  const loadData = async () => {
    try {
      const commRes = await marketsApi.getCommodities();
      setCommodities(commRes.data);
      
      // Load prices for top commodities
      const priceMap: Record<string, PriceData> = {};
      for (const comm of commRes.data.slice(0, 4)) {
        try {
          const priceRes = await marketsApi.getCurrentPrices(comm.id);
          if (priceRes.data.prices.length > 0) {
            priceMap[comm.id] = priceRes.data.prices[0];
          }
        } catch {}
      }
      setPrices(priceMap);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Good morning, {user?.first_name || 'Farmer'}!
            </Text>
            <Text style={styles.location}>📍 Uganda</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Text style={styles.profileInitial}>
              {user?.first_name?.[0] || 'F'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#E8F5E9' }]}
            onPress={() => router.push('/(tabs)/markets')}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>Prices</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#FFF3E0' }]}
            onPress={() => router.push('/(tabs)/advisory')}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionLabel}>Ask AI</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#E3F2FD' }]}
            onPress={() => router.push('/diseases/detect')}
          >
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionLabel}>Detect</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#FCE4EC' }]}
            onPress={() => router.push('/(tabs)/marketplace')}
          >
            <Text style={styles.actionIcon}>🛒</Text>
            <Text style={styles.actionLabel}>Sell</Text>
          </TouchableOpacity>
        </View>
        
        {/* Market Prices */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💰 Market Prices</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/markets')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          
          {commodities.slice(0, 4).map((commodity) => {
            const price = prices[commodity.id];
            const change = price?.change_percent || 0;
            const isPositive = change >= 0;
            
            return (
              <TouchableOpacity
                key={commodity.id}
                style={styles.priceCard}
                onPress={() => router.push(`/markets/${commodity.id}`)}
              >
                <View style={styles.priceCardLeft}>
                  <Text style={styles.commodityName}>{commodity.name}</Text>
                  <Text style={styles.commodityCategory}>
                    {commodity.category}
                  </Text>
                </View>
                <View style={styles.priceCardRight}>
                  <Text style={styles.priceValue}>
                    UGX {price?.price_per_unit?.toLocaleString() || '—'}/kg
                  </Text>
                  {price?.change_percent !== null && price?.change_percent !== undefined && (
                    <Text style={[
                      styles.priceChange,
                      { color: isPositive ? '#2E7D32' : '#C62828' }
                    ]}>
                      {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Alerts</Text>
          <View style={styles.alertCard}>
            <Text style={styles.alertText}>
              Fall armyworm reported in your area. Scout your maize fields.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9F4' },
  scrollContent: { padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#1B5E20' },
  location: { fontSize: 14, color: '#666', marginTop: 4 },
  profileButton: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#2E7D32',
    justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    flex: 1, marginHorizontal: 4, padding: 12,
    borderRadius: 12, alignItems: 'center',
  },
  actionIcon: { fontSize: 28, marginBottom: 4 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#333' },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
  seeAll: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  priceCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 8, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  priceCardLeft: { flex: 1 },
  commodityName: { fontSize: 16, fontWeight: '600', color: '#333' },
  commodityCategory: { fontSize: 12, color: '#999', marginTop: 2 },
  priceCardRight: { alignItems: 'flex-end' },
  priceValue: { fontSize: 16, fontWeight: 'bold', color: '#1B5E20' },
  priceChange: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  alertCard: {
    backgroundColor: '#FFF3E0', borderRadius: 12, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#F57C00',
  },
  alertText: { color: '#E65100', fontSize: 14, lineHeight: 20 },
});