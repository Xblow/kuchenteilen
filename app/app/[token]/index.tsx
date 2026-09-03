import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useGroupContext } from '../../src/context';
import { useExpenses } from '../../src/hooks/useExpenses';
import { useParticipants } from '../../src/hooks/useParticipants';
import { useBalances } from '../../src/hooks/useBalances';
import { deleteExpense } from '../../src/api/expenses';
import { Expense, CurrencyBalances, ParticipantBalance, SuggestedSettlement } from '../../src/types';
import { AmountText, currencySymbol } from '../../src/components/AmountText';
import { participantColor } from '../../src/utils/participantColor';
import { useTheme, Colors } from '../../src/theme';

// ── Avatars ──────────────────────────────────────────────────────────────────

const MAX_AVATARS = 4;

function SplitAvatars({
  splits,
  participantById,
  cardBg,
}: {
  splits: Expense['splits'];
  participantById: Record<string, { name: string }>;
  cardBg: string;
}) {
  const all = splits ?? [];
  if (all.length === 0) return null;
  const visible = all.slice(0, MAX_AVATARS);
  const overflow = all.length - visible.length;
  return (
    <View style={avatarStyles.row}>
      {visible.map((s, i) => {
        const name = participantById[s.participant_id]?.name ?? '?';
        const { bg, text } = participantColor(s.participant_id);
        return (
          <View key={s.participant_id} style={[avatarStyles.circle, { backgroundColor: bg, marginLeft: i === 0 ? 0 : -6, borderColor: cardBg }]}>
            <Text style={[avatarStyles.letter, { color: text }]}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        );
      })}
      {overflow > 0 && (
        <View style={[avatarStyles.circle, avatarStyles.overflow, { marginLeft: -6, borderColor: cardBg }]}>
          <Text style={avatarStyles.overflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginRight: 6 },
  circle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  letter: { fontSize: 11, fontWeight: '700' },
  overflow: { backgroundColor: '#E5E7EB' },
  overflowText: { fontSize: 9, fontWeight: '700', color: '#6B7280' },
});

// ── Balances inline ───────────────────────────────────────────────────────────

function fmt(cents: number, currency: string) {
  return `${currencySymbol(currency)}${(Math.abs(cents) / 100).toFixed(2)}`;
}

function BalancesTab({ serverUrl, token }: { serverUrl: string; token: string }) {
  const router = useRouter();
  const { myParticipantId } = useGroupContext();
  const { colors: C } = useTheme();
  const { data, isLoading, refetch } = useBalances(serverUrl, token);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showAll, setShowAll] = React.useState(!myParticipantId);

  const handleRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}><ActivityIndicator color={C.primary} /></View>;
  }

  const currencies = data?.currencies ?? {};
  const currencyKeys = Object.keys(currencies).sort();

  const filterForMe = (cb: CurrencyBalances) => {
    if (showAll || !myParticipantId) return cb;
    return {
      participant_balances: cb.participant_balances.filter(
        (b) => b.participant_id === myParticipantId,
      ),
      suggested_settlements: cb.suggested_settlements.filter(
        (s) => s.from_participant_id === myParticipantId || s.to_participant_id === myParticipantId,
      ),
    };
  };

  const renderBalance = (item: ParticipantBalance, currency: string) => {
    const net = item.net_cents;
    const netColor = net > 0 ? C.success : net < 0 ? C.danger : C.sub;
    const label = net > 0 ? `is owed ${fmt(net, currency)}` : net < 0 ? `owes ${fmt(-net, currency)}` : 'settled up';
    return (
      <View key={item.participant_id} style={{ backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{item.participant_name}</Text>
          <Text style={{ fontSize: 13, color: netColor, marginTop: 2 }}>{label}</Text>
        </View>
        <Text style={{ fontSize: 15, fontWeight: '700', marginLeft: 8, color: netColor }}>{net < 0 ? '-' : ''}{fmt(net, currency)}</Text>
      </View>
    );
  };

  const renderSettlement = (item: SuggestedSettlement, currency: string, idx: number) => (
    <View key={idx} style={{ backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{item.from_participant_name} → {item.to_participant_name}</Text>
        <Text style={{ fontSize: 13, color: C.sub }}>{fmt(item.amount_cents, currency)}</Text>
      </View>
      <TouchableOpacity
        style={{ backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}
        onPress={() => router.push(`/${token}/settle?payerId=${item.from_participant_id}&payeeId=${item.to_participant_id}&amount=${item.amount_cents}&currency=${encodeURIComponent(currency)}`)}
      >
        <Text style={{ color: C.white, fontWeight: '600', fontSize: 13 }}>Settle</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
    >
      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 10, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 7, backgroundColor: !showAll ? C.primary : 'transparent', opacity: myParticipantId ? 1 : 0.4 }}
          onPress={() => myParticipantId && setShowAll(false)}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: !showAll ? C.white : C.sub }}>Me</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 7, backgroundColor: showAll ? C.primary : 'transparent' }}
          onPress={() => setShowAll(true)}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: showAll ? C.white : C.sub }}>Everyone</Text>
        </TouchableOpacity>
      </View>

      {currencyKeys.length === 0 ? (
        <Text style={{ fontSize: 15, color: C.sub, textAlign: 'center' }}>No expenses yet.</Text>
      ) : (
        <>
          {/* Net Balances across all currencies */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Net Balances</Text>
          {currencyKeys.map((cur) => {
            const cb = filterForMe(currencies[cur]);
            if (cb.participant_balances.length === 0) return null;
            return (
              <View key={`bal-${cur}`}>
                {currencyKeys.length > 1 && (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.sub, marginBottom: 4, marginLeft: 2 }}>{cur}</Text>
                )}
                {cb.participant_balances.map((b) => renderBalance(b, cur))}
              </View>
            );
          })}
          {currencyKeys.every((cur) => filterForMe(currencies[cur]).participant_balances.length === 0) && (
            <Text style={{ fontSize: 15, color: C.sub, textAlign: 'center', marginBottom: 10 }}>All settled up!</Text>
          )}

          {/* Suggested Settlements across all currencies */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 20 }}>Suggested Settlements</Text>
          {currencyKeys.map((cur) => {
            const cb = filterForMe(currencies[cur]);
            if (cb.suggested_settlements.length === 0) return null;
            return (
              <View key={`sett-${cur}`}>
                {currencyKeys.length > 1 && (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.sub, marginBottom: 4, marginLeft: 2 }}>{cur}</Text>
                )}
                {cb.suggested_settlements.map((s, i) => renderSettlement(s, cur, i))}
              </View>
            );
          })}
          {currencyKeys.every((cur) => filterForMe(currencies[cur]).suggested_settlements.length === 0) && (
            <Text style={{ fontSize: 15, color: C.sub, textAlign: 'center' }}>All settled up!</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

function makeStyles(C: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    topBar: {
      backgroundColor: C.card,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    homeBtn: { flexShrink: 0 },
    homeBtnText: { fontSize: 15, color: C.sub, fontWeight: '600' },
    groupNameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    groupName: { fontSize: 17, fontWeight: '700', color: C.text },
    themeBtn: { flexShrink: 0 },
    themeToggle: { fontSize: 18 },
    settingsBtnText: { fontSize: 18, color: C.text },
    tabRow: {
      flexDirection: 'row',
      backgroundColor: C.card,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabBtnActive: { borderBottomColor: C.primary },
    tabText: { fontSize: 14, fontWeight: '500', color: C.sub },
    tabTextActive: { color: C.primary, fontWeight: '700' },
    list: { padding: 16 },
    emptyContainer: { flex: 1 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
    emptyText: { fontSize: 15, color: C.sub, textAlign: 'center' },
    card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    cardMain: { flex: 1 },
    description: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 2 },
    subText: { fontSize: 13, color: C.sub },
    amount: { fontSize: 16, fontWeight: '600', color: C.text, marginLeft: 8 },
    expanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
    splitsLabel: { fontSize: 13, fontWeight: '600', color: C.sub, marginBottom: 4 },
    splitRow: { fontSize: 14, color: C.text, marginBottom: 2 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionBtn: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
    actionBtnDanger: { borderColor: C.danger, backgroundColor: C.dangerLight },
    actionBtnText: { fontSize: 13, fontWeight: '600', color: C.primary },
    actionBtnTextDanger: { color: C.danger },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: C.card,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    addTxBtn: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    addTxBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },
  });
}

export default function GroupHomeScreen() {
  const { serverUrl, token, group } = useGroupContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark, colors: C, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data: expenses, isLoading, refetch } = useExpenses(serverUrl, token);
  const { byId: participantById } = useParticipants(serverUrl, token);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'transactions' | 'balances'>('transactions');

  const sorted = [...(expenses ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const handleRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const handleDelete = (expense: Expense) => {
    const doDelete = async () => {
      try {
        await deleteExpense(serverUrl, token, expense.record_id);
        queryClient.invalidateQueries({ queryKey: ['expenses', serverUrl, token] });
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete expense.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${expense.description}"?`)) doDelete();
    } else {
      Alert.alert('Delete Expense', `Delete "${expense.description}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const renderItem = ({ item }: { item: Expense }) => {
    const isExpanded = expandedId === item.record_id;
    const paidByName = participantById[item.paid_by_id]?.name ?? '…';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpandedId((prev) => (prev === item.record_id ? null : item.record_id))}
        activeOpacity={0.8}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardMain}>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.subText}>Paid by {paidByName} · {item.date.slice(0, 10)}</Text>
          </View>
          <SplitAvatars splits={item.splits ?? []} participantById={participantById} cardBg={C.card} />
          <AmountText cents={item.amount_cents} currency={item.currency} style={styles.amount} />
        </View>
        {isExpanded && (
          <View style={styles.expanded}>
            <Text style={styles.splitsLabel}>Splits:</Text>
            {item.splits?.map((split) => (
              <Text key={split.id} style={styles.splitRow}>
                {participantById[split.participant_id]?.name ?? split.participant_id}:{' '}
                <AmountText cents={split.amount_cents} currency={item.currency} />
              </Text>
            ))}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/${token}/expense/${item.record_id}?serverUrl=${encodeURIComponent(serverUrl)}`)}>
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/${token}/expense/${item.record_id}/history?serverUrl=${encodeURIComponent(serverUrl)}`)}>
                <Text style={styles.actionBtnText}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item)}>
                <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/')}>
          <Text style={styles.homeBtnText}>🎂 Kuchenteilen</Text>
        </TouchableOpacity>
        <View style={styles.groupNameRow}>
          <Text style={styles.groupName}>{group.name}</Text>
          <TouchableOpacity
            onPress={() => router.push(`/${token}/settings?serverUrl=${encodeURIComponent(serverUrl)}`)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.settingsBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.themeBtn} onPress={toggleTheme} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.themeToggle}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tab toggle */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'transactions' && styles.tabBtnActive]}
          onPress={() => setTab('transactions')}
        >
          <Text style={[styles.tabText, tab === 'transactions' && styles.tabTextActive]}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'balances' && styles.tabBtnActive]}
          onPress={() => setTab('balances')}
        >
          <Text style={[styles.tabText, tab === 'balances' && styles.tabTextActive]}>Balances</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {tab === 'transactions' ? (
        <>
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.record_id}
            contentContainerStyle={[sorted.length === 0 ? styles.emptyContainer : styles.list, { paddingBottom: 90 }]}
            refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={handleRefresh} tintColor={C.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No expenses yet — add the first one!</Text>
              </View>
            }
            renderItem={renderItem}
          />
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.addTxBtn}
              onPress={() => router.push(`/${token}/expense/new?serverUrl=${encodeURIComponent(serverUrl)}`)}
            >
              <Text style={styles.addTxBtnText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <BalancesTab serverUrl={serverUrl} token={token} />
      )}
    </View>
  );
}
