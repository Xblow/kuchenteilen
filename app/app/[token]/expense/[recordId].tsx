import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useGroupContext } from '../../../src/context';
import { useParticipants } from '../../../src/hooks/useParticipants';
import { useExpenses } from '../../../src/hooks/useExpenses';
import { editExpense } from '../../../src/api/expenses';
import { ExpenseForm, ExpenseFormValues } from '../../../src/components/ExpenseForm';
import { SplitInput } from '../../../src/api/expenses';
import { Expense } from '../../../src/types';

function buildSplits(values: ExpenseFormValues): SplitInput[] {
  if (values.split_type === 'equal') {
    return values.equal_participants.map((id) => ({ participant_id: id }));
  }
  return Object.entries(values.exact_splits)
    .filter(([, amt]) => amt && parseFloat(amt) > 0)
    .map(([id, amt]) => ({
      participant_id: id,
      amount_cents: Math.round(parseFloat(amt) * 100),
    }));
}

function expenseToInitialValues(expense: Expense): ExpenseFormValues {
  const splits = expense.splits ?? [];
  const allSplitIds = splits.map((s) => s.participant_id);

  const amounts = splits.map((s) => s.amount_cents);
  const isExact =
    amounts.length > 0 && Math.max(...amounts) - Math.min(...amounts) > 1;

  const exactSplits: Record<string, string> = {};
  if (isExact) {
    for (const split of splits) {
      exactSplits[split.participant_id] = (split.amount_cents / 100).toFixed(2);
    }
  }

  return {
    paid_by_id: expense.paid_by_id,
    description: expense.description,
    amount: (expense.amount_cents / 100).toFixed(2),
    currency: expense.currency,
    date: expense.date.slice(0, 10),
    split_type: isExact ? 'exact' : 'equal',
    equal_participants: allSplitIds,
    exact_splits: exactSplits,
  };
}

export default function EditExpenseScreen() {
  const { serverUrl, token, group } = useGroupContext();
  const { recordId } = useLocalSearchParams<{ recordId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: participants } = useParticipants(serverUrl, token);
  const { data: expenses } = useExpenses(serverUrl, token);

  const expense = expenses?.find((e) => e.record_id === recordId);

  if (!expense) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Expense not found</Text>
      </View>
    );
  }

  const handleSubmit = async (values: ExpenseFormValues) => {
    const splits = buildSplits(values);
    await editExpense(serverUrl, token, recordId ?? '', {
      paid_by_id: values.paid_by_id,
      description: values.description,
      amount_cents: Math.round(parseFloat(values.amount) * 100),
      currency: values.currency,
      date: new Date(values.date).toISOString(),
      split_type: values.split_type,
      splits,
    });
    queryClient.invalidateQueries({ queryKey: ['expenses', serverUrl, token] });
    router.back();
  };

  return (
    <ExpenseForm
      initialValues={expenseToInitialValues(expense)}
      participants={participants ?? []}
      group={group}
      serverUrl={serverUrl}
      token={token}
      onSubmit={handleSubmit}
      submitLabel="Save Changes"
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  notFound: {
    fontSize: 16,
    color: '#6B7280',
  },
});
