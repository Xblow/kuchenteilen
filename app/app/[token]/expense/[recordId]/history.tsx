import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useGroupContext } from '../../../../src/context';
import { useParticipants } from '../../../../src/hooks/useParticipants';
import { getExpenseHistory } from '../../../../src/api/expenses';
import { Expense } from '../../../../src/types';
import { useTheme, Colors } from '../../../../src/theme';

function makeStyles(C: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16 },
    card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    cardDeleted: { backgroundColor: C.bg, borderColor: C.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    version: { fontSize: 13, fontWeight: '700', color: C.primary },
    timestamp: { fontSize: 12, color: C.sub },
    deletedLabel: { fontSize: 15, fontWeight: '600', color: C.danger },
    desc: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 2 },
    amount: { fontSize: 15, fontWeight: '500', color: C.text, marginBottom: 2 },
    sub: { fontSize: 13, color: C.sub },
    splits: { marginTop: 8 },
    splitsLabel: { fontSize: 12, fontWeight: '600', color: C.sub, marginBottom: 2 },
    splitRow: { fontSize: 13, color: C.text },
    emptyText: { textAlign: 'center', color: C.sub, fontSize: 15, marginTop: 40 },
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function ExpenseHistoryScreen() {
  const { serverUrl, token } = useGroupContext();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { recordId } = useLocalSearchParams<{ recordId: string }>();
  const { byId: participantById } = useParticipants(serverUrl, token);

  const { data, isLoading } = useQuery({
    queryKey: ['expense-history', serverUrl, token, recordId],
    queryFn: () => getExpenseHistory(serverUrl, token, recordId ?? ''),
  });

  // Newest first
  const history = [...(data ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const totalVersions = history.length;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: Expense; index: number }) => {
    const isDeleted = item.amount_cents === 0;
    const versionNum = totalVersions - index;
    return (
      <View style={[styles.card, isDeleted && styles.cardDeleted]}>
        <View style={styles.cardHeader}>
          <Text style={styles.version}>#{versionNum}</Text>
          <Text style={styles.timestamp}>{formatDateTime(item.created_at)}</Text>
        </View>
        {isDeleted ? (
          <Text style={styles.deletedLabel}>Deleted</Text>
        ) : (
          <>
            <Text style={styles.desc}>{item.description}</Text>
            <Text style={styles.amount}>
              {item.currency} {(item.amount_cents / 100).toFixed(2)}
            </Text>
            <Text style={styles.sub}>
              Paid by {participantById[item.paid_by_id]?.name ?? item.paid_by_id}
            </Text>
            {item.splits?.length > 0 && (
              <View style={styles.splits}>
                <Text style={styles.splitsLabel}>Splits:</Text>
                {item.splits.map((s) => (
                  <Text key={s.id} style={styles.splitRow}>
                    {participantById[s.participant_id]?.name ?? s.participant_id}:{' '}
                    {item.currency} {(s.amount_cents / 100).toFixed(2)}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No history available.</Text>
        }
        renderItem={renderItem}
      />
    </View>
  );
}

