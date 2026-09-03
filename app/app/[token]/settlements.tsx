import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useGroupContext } from '../../src/context';
import { useSettlements } from '../../src/hooks/useSettlements';
import { useParticipants } from '../../src/hooks/useParticipants';
import { deleteSettlement } from '../../src/api/settlements';
import { Settlement } from '../../src/types';
import { useTheme, Colors } from '../../src/theme';

function makeStyles(C: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    list: { padding: 16 },
    card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
    cardMain: { flex: 1 },
    participants: { fontSize: 15, fontWeight: '600', color: C.text },
    date: { fontSize: 13, color: C.sub, marginTop: 2 },
    note: { fontSize: 13, color: C.sub, fontStyle: 'italic', marginTop: 2 },
    right: { alignItems: 'flex-end', gap: 6 },
    amount: { fontSize: 15, fontWeight: '600', color: C.text },
    deleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.dangerLight, alignItems: 'center', justifyContent: 'center' },
    deleteBtnText: { color: C.danger, fontSize: 16, fontWeight: '600', lineHeight: 20 },
    emptyText: { textAlign: 'center', color: C.sub, fontSize: 15, marginTop: 60 },
  });
}

export default function SettlementsScreen() {
  const { serverUrl, token } = useGroupContext();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const queryClient = useQueryClient();
  const { data: settlements } = useSettlements(serverUrl, token);
  const { byId: participantById } = useParticipants(serverUrl, token);

  const sorted = [...(settlements ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const handleDelete = (s: Settlement) => {
    Alert.alert('Delete Settlement', 'Delete this settlement record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSettlement(serverUrl, token, s.id);
            queryClient.invalidateQueries({ queryKey: ['settlements', serverUrl, token] });
            queryClient.invalidateQueries({ queryKey: ['balances', serverUrl, token] });
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete settlement.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No settlements recorded yet.</Text>
        }
        renderItem={({ item }) => {
          const payerName = participantById[item.payer_id]?.name ?? item.payer_id;
          const payeeName = participantById[item.payee_id]?.name ?? item.payee_id;
          return (
            <View style={styles.card}>
              <View style={styles.cardMain}>
                <Text style={styles.participants}>
                  {payerName} → {payeeName}
                </Text>
                <Text style={styles.date}>{item.date.slice(0, 10)}</Text>
                {!!item.note && (
                  <Text style={styles.note}>{item.note}</Text>
                )}
              </View>
              <View style={styles.right}>
                <Text style={styles.amount}>
                  {item.currency} {(item.amount_cents / 100).toFixed(2)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteBtnText}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

