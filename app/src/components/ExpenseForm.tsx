import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Participant, Group } from '../types';
import { ParticipantChip } from './ParticipantChip';
import { CurrencyPicker } from './CurrencyPicker';
import { useTheme, Colors } from '../theme';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function makeStyles(C: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { padding: 16, paddingBottom: 40 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: C.sub,
      marginBottom: 6,
      marginTop: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    subLabel: { fontSize: 13, color: C.sub, marginBottom: 8 },
    chipsRow: { flexDirection: 'row' },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    input: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: C.text,
    },
    amountRow: { flexDirection: 'row', gap: 8 },
    amountInput: { flex: 1 },
    currencyBtn: {
      backgroundColor: C.primaryLight,
      borderRadius: 10,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 64,
    },
    currencyText: { fontSize: 15, fontWeight: '600', color: C.primary },
    dateWebRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dateField: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dateText: { fontSize: 15, color: C.text },
    dayOfWeek: { fontSize: 14, color: C.sub },
    segmented: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      overflow: 'hidden',
    },
    segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: C.card },
    segBtnActive: { backgroundColor: C.primary },
    segText: { fontSize: 14, fontWeight: '500', color: C.sub },
    segTextActive: { color: C.white },
    splitSection: { marginTop: 12 },
    exactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    exactName: { flex: 1, fontSize: 15, color: C.text },
    exactInput: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 15,
      color: C.text,
      width: 100,
      textAlign: 'right',
    },
    exactTotal: { fontSize: 13, color: C.sub, textAlign: 'right', marginTop: 4 },
    errorText: { color: C.danger, fontSize: 13, marginTop: 8 },
    submitBtn: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 24,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: { color: C.white, fontSize: 16, fontWeight: '600' },
  });
}

export interface ExpenseFormValues {
  paid_by_id: string;
  description: string;
  amount: string;
  currency: string;
  date: string;
  split_type: 'equal' | 'exact';
  equal_participants: string[];
  exact_splits: Record<string, string>;
}

interface Props {
  initialValues?: Partial<ExpenseFormValues>;
  participants: Participant[];
  group: Group;
  serverUrl: string;
  token: string;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  submitLabel?: string;
}

function toDateObj(iso?: string): Date {
  if (iso) return new Date(iso + 'T12:00:00');
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

export function ExpenseForm({
  initialValues,
  participants,
  group,
  serverUrl,
  token,
  onSubmit,
  submitLabel = 'Save',
}: Props) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const allIds = participants.map((p) => p.id);

  const [paidById, setPaidById] = useState(initialValues?.paid_by_id ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [amount, setAmount] = useState(initialValues?.amount ?? '');
  const [currency, setCurrency] = useState(initialValues?.currency ?? group.currency);
  const [dateObj, setDateObj] = useState<Date>(() => toDateObj(initialValues?.date));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const date = dateObj.toISOString().slice(0, 10);
  const [splitType, setSplitType] = useState<'equal' | 'exact'>(initialValues?.split_type ?? 'equal');
  const [equalParticipants, setEqualParticipants] = useState<string[]>(
    initialValues?.equal_participants ?? allIds,
  );
  const [exactSplits, setExactSplits] = useState<Record<string, string>>(
    initialValues?.exact_splits ?? {},
  );

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [exactError, setExactError] = useState('');

  const toggleEqualParticipant = (id: string) => {
    setEqualParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const totalCents = Math.round(parseFloat(amount || '0') * 100);
  const exactTotal = Object.values(exactSplits).reduce(
    (sum, v) => sum + Math.round(parseFloat(v || '0') * 100),
    0,
  );

  const handleSubmit = async () => {
    setError('');
    setExactError('');

    if (!paidById) { setError('Please select who paid.'); return; }
    if (!description.trim()) { setError('Please enter a description.'); return; }
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (splitType === 'equal' && equalParticipants.length === 0) {
      setError('Please select at least one participant for the split.');
      return;
    }
    if (splitType === 'exact') {
      const involvedIds = Object.keys(exactSplits).filter(
        (id) => exactSplits[id] && parseFloat(exactSplits[id]) > 0,
      );
      if (involvedIds.length === 0) {
        setError('Please enter split amounts for at least one participant.');
        return;
      }
      const splitTotal = involvedIds.reduce(
        (sum, id) => sum + Math.round(parseFloat(exactSplits[id]) * 100),
        0,
      );
      const expTotal = Math.round(parsedAmount * 100);
      if (splitTotal !== expTotal) {
        setExactError(
          `Split total ($${(splitTotal / 100).toFixed(2)}) does not match expense amount ($${(expTotal / 100).toFixed(2)}).`,
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({ paid_by_id: paidById, description, amount, currency, date, split_type: splitType, equal_participants: equalParticipants, exact_splits: exactSplits });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save expense.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Paid by</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {participants.map((p) => (
          <ParticipantChip
            key={p.id}
            participantId={p.id}
            name={p.name}
            selected={paidById === p.id}
            onPress={() => setPaidById(p.id)}
          />
        ))}
      </ScrollView>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Dinner at La Trattoria"
        placeholderTextColor={C.sub}
      />

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
        <TouchableOpacity style={styles.currencyBtn} onPress={() => setShowCurrencyPicker(true)}>
          <Text style={styles.currencyText}>{currency}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Date</Text>
      {Platform.OS === 'web' ? (
        <View style={styles.dateWebRow}>
          <DateTimePicker
            value={dateObj}
            mode="date"
            display="default"
            onChange={(_: DateTimePickerEvent, selected?: Date) => {
              if (selected) setDateObj(selected);
            }}
          />
          <Text style={styles.dayOfWeek}>{DAY_NAMES[dateObj.getDay()]}</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity style={styles.dateField} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>{date}</Text>
            <Text style={styles.dayOfWeek}>{DAY_NAMES[dateObj.getDay()]}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateObj}
              mode="date"
              display="default"
              onChange={(_: DateTimePickerEvent, selected?: Date) => {
                setShowDatePicker(false);
                if (selected) setDateObj(selected);
              }}
            />
          )}
        </>
      )}

      <Text style={styles.label}>Split</Text>
      <View style={styles.segmented}>
        <TouchableOpacity
          style={[styles.segBtn, splitType === 'equal' && styles.segBtnActive]}
          onPress={() => setSplitType('equal')}
        >
          <Text style={[styles.segText, splitType === 'equal' && styles.segTextActive]}>Equal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, splitType === 'exact' && styles.segBtnActive]}
          onPress={() => setSplitType('exact')}
        >
          <Text style={[styles.segText, splitType === 'exact' && styles.segTextActive]}>Exact</Text>
        </TouchableOpacity>
      </View>

      {splitType === 'equal' && (
        <View style={styles.splitSection}>
          <Text style={styles.subLabel}>Include in split:</Text>
          <View style={styles.chipsWrap}>
            {participants.map((p) => (
              <ParticipantChip
                key={p.id}
                participantId={p.id}
                name={p.name}
                selected={equalParticipants.includes(p.id)}
                onPress={() => toggleEqualParticipant(p.id)}
              />
            ))}
          </View>
        </View>
      )}

      {splitType === 'exact' && (
        <View style={styles.splitSection}>
          {participants.map((p) => (
            <View key={p.id} style={styles.exactRow}>
              <Text style={styles.exactName}>{p.name}</Text>
              <TextInput
                style={styles.exactInput}
                value={exactSplits[p.id] ?? ''}
                onChangeText={(v) => setExactSplits((prev) => ({ ...prev, [p.id]: v }))}
                placeholder="0.00"
                placeholderTextColor={C.sub}
                keyboardType="decimal-pad"
              />
            </View>
          ))}
          <Text style={styles.exactTotal}>
            Total split: ${(exactTotal / 100).toFixed(2)} / ${(totalCents / 100).toFixed(2)}
          </Text>
          {!!exactError && <Text style={styles.errorText}>{exactError}</Text>}
        </View>
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={C.white} />
        ) : (
          <Text style={styles.submitText}>{submitLabel}</Text>
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
