import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useGroupContext } from '../../src/context';
import { useParticipants } from '../../src/hooks/useParticipants';
import { createSettlement } from '../../src/api/settlements';
import { CurrencyPicker } from '../../src/components/CurrencyPicker';
import { ParticipantChip } from '../../src/components/ParticipantChip';
import { useTheme, Colors } from '../../src/theme';

function makeStyles(C: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { padding: 16, paddingBottom: 40 },
    label: {
      fontSize: 13, fontWeight: '600', color: C.sub,
      marginBottom: 8, marginTop: 16,
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
    input: {
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 15, color: C.text,
    },
    amountRow: { flexDirection: 'row', gap: 8 },
    amountInput: { flex: 1 },
    currencyBtn: {
      backgroundColor: C.primaryLight, borderRadius: 10,
      paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', minWidth: 64,
    },
    currencyText: { fontSize: 15, fontWeight: '600', color: C.primary },
    errorText: { color: C.danger, fontSize: 13, marginTop: 8 },
    submitBtn: {
      backgroundColor: C.primary, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center', marginTop: 24,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: { color: C.white, fontSize: 16, fontWeight: '600' },
  });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SettleScreen() {
  const { serverUrl, token, group } = useGroupContext();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { payerId, payeeId, amount: amountParam } = useLocalSearchParams<{
    payerId?: string;
    payeeId?: string;
    amount?: string;
  }>();
  const { data: participants } = useParticipants(serverUrl, token);

  const initialAmount = amountParam
    ? (parseInt(amountParam, 10) / 100).toFixed(2)
    : '';

  const [selectedPayerId, setSelectedPayerId] = useState(payerId ?? '');
  const [selectedPayeeId, setSelectedPayeeId] = useState(payeeId ?? '');
  const [amount, setAmount] = useState(initialAmount);
  const [currency, setCurrency] = useState(group.currency);
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!selectedPayerId) { setError('Please select payer.'); return; }
    if (!selectedPayeeId) { setError('Please select payee.'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount.'); return; }
    if (selectedPayerId === selectedPayeeId) { setError('Payer and payee must be different.'); return; }

    setSubmitting(true);
    try {
      await createSettlement(serverUrl, token, {
        payer_id: selectedPayerId,
        payee_id: selectedPayeeId,
        amount_cents: Math.round(parseFloat(amount) * 100),
        currency,
        date: new Date(date).toISOString(),
        note,
      });
      queryClient.invalidateQueries({ queryKey: ['settlements', serverUrl, token] });
      queryClient.invalidateQueries({ queryKey: ['balances', serverUrl, token] });
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to record settlement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Payer (who pays)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {(participants ?? []).map((p) => (
          <ParticipantChip
            key={p.id}
            participantId={p.id}
            name={p.name}
            selected={selectedPayerId === p.id}
            onPress={() => setSelectedPayerId(p.id)}
          />
        ))}
      </ScrollView>

      <Text style={styles.label}>Payee (who receives)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {(participants ?? []).map((p) => (
          <ParticipantChip
            key={p.id}
            participantId={p.id}
            name={p.name}
            selected={selectedPayeeId === p.id}
            onPress={() => setSelectedPayeeId(p.id)}
          />
        ))}
      </ScrollView>

      <Text style={styles.label}>Amount</Text>
      <View style={styles.amountRow}>
        <TextInput
          style={[styles.input, styles.amountInput]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={C.sub}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity
          style={styles.currencyBtn}
          onPress={() => setShowCurrencyPicker(true)}
        >
          <Text style={styles.currencyText}>{currency}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Date</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={C.sub}
      />

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="e.g. via bank transfer"
        placeholderTextColor={C.sub}
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={C.white} />
        ) : (
          <Text style={styles.submitText}>Record Settlement</Text>
        )}
      </TouchableOpacity>

      <CurrencyPicker
        visible={showCurrencyPicker}
        currencies={group.currencies?.length ? group.currencies : [group.currency]}
        selected={currency}
        serverUrl={serverUrl}
        token={token}
        onSelect={setCurrency}
        onClose={() => setShowCurrencyPicker(false)}
      />
    </ScrollView>
  );
}

