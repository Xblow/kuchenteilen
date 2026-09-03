import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useGroupContext } from '../../src/context';
import { useBalances } from '../../src/hooks/useBalances';
import { CurrencyBalances, ParticipantBalance, SuggestedSettlement } from '../../src/types';
import { currencySymbol } from '../../src/components/AmountText';
import { useTheme, Colors } from '../../src/theme';

function makeStyles(C: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 40 },
    currencyHeader: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 16, marginBottom: 12 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
    cardMain: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: C.text },
    subText: { fontSize: 13, marginTop: 2 },
    netAmount: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
    settlementText: { fontSize: 15, fontWeight: '600', color: C.text },
    settlementAmount: { fontSize: 13, color: C.sub, marginTop: 2 },
    settleBtn: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    settleBtnText: { color: C.white, fontWeight: '600', fontSize: 13 },
    emptyText: { color: C.sub, fontSize: 14, marginBottom: 8 },
  });
}

function fmt(cents: number, currency: string): string {
  const sym = currencySymbol(currency);
  return `${sym}${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default function BalancesScreen() {
  const { serverUrl, token } = useGroupContext();
  const router = useRouter();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data, isLoading, refetch } = useBalances(serverUrl, token);
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const currencies = data?.currencies ?? {};
  const currencyKeys = Object.keys(currencies).sort();

  const renderBalance = (item: ParticipantBalance, currency: string) => {
    const net = item.net_cents;
    let netColor = C.sub;
    let subLabel = 'Settled up';
    if (net > 0) {
      netColor = C.success;
      subLabel = `is owed ${fmt(net, currency)}`;
    } else if (net < 0) {
      netColor = C.danger;
      subLabel = `owes ${fmt(-net, currency)}`;
    }
    return (
      <View key={item.participant_id} style={styles.card}>
        <View style={styles.cardMain}>
          <Text style={styles.name}>{item.participant_name}</Text>
          <Text style={[styles.subText, { color: netColor }]}>{subLabel}</Text>
        </View>
        <Text style={[styles.netAmount, { color: netColor }]}>
          {net < 0 ? '-' : ''}{fmt(net, currency)}
        </Text>
      </View>
    );
  };

  const renderSettlement = (item: SuggestedSettlement, currency: string, idx: number) => (
    <View key={idx} style={styles.card}>
      <View style={styles.cardMain}>
        <Text style={styles.settlementText}>
          {item.from_participant_name} → {item.to_participant_name}
        </Text>
        <Text style={styles.settlementAmount}>{fmt(item.amount_cents, currency)}</Text>
      </View>
      <TouchableOpacity
        style={styles.settleBtn}
        onPress={() =>
          router.push(
            `/${token}/settle?payerId=${item.from_participant_id}&payeeId=${item.to_participant_id}&amount=${item.amount_cents}&currency=${encodeURIComponent(currency)}`,
          )
        }
      >
        <Text style={styles.settleBtnText}>Settle</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrency = (currency: string, cb: CurrencyBalances) => (
    <View key={currency}>
      <Text style={styles.currencyHeader}>{currency}</Text>

      <Text style={styles.sectionTitle}>Net Balances</Text>
      {cb.participant_balances.length === 0 ? (
        <Text style={styles.emptyText}>No balances yet.</Text>
      ) : (
        cb.participant_balances.map((item) => renderBalance(item, currency))
      )}

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Suggested Settlements</Text>
      {cb.suggested_settlements.length === 0 ? (
        <Text style={styles.emptyText}>All settled up!</Text>
      ) : (
        cb.suggested_settlements.map((item, idx) => renderSettlement(item, currency, idx))
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
      }
    >
      {currencyKeys.length === 0 ? (
        <Text style={styles.emptyText}>No expenses yet.</Text>
      ) : (
        currencyKeys.map((cur) => renderCurrency(cur, currencies[cur]))
      )}
    </ScrollView>
  );
}

