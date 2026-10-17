import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { marketsApi } from '../../services/api';

export default function MarketsScreen() {
  const router = useRouter();
  const [commodities, setCommodities] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    loadCommodities();
  }, []);
  
  useEffect(() => {
    if (search) {
      setFiltered(
        commodities.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    } else {
      setFiltered(commodities);
    }
  }, [search, commodities]);
  
  const loadCommodities = async () => {
    try {
      const res = await marketsApi.getCommodities();
      setCommodities(res.data);
      setFiltered(res.data);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Market Prices</Text>
        <TextInput
          style={styles.search}
          placeholder="Search commodities..."
          value={search}
          onChangeText={setSearch}
        />
      </View>
      
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/markets/${item.id}`)}
          >
            <View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>
                {item.category} • per {item.unit}
              </Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1B5E20', marginBottom: 12 },
  search: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
  },
  list: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 8, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  cardSubtitle: { fontSize: 13, color: '#999', marginTop: 4 },
  arrow: { fontSize: 20, color: '#2E7D32' },
});