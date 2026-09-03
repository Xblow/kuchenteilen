import React from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useGroupContext } from '../../../src/context';
import { useParticipants } from '../../../src/hooks/useParticipants';
import { createExpense } from '../../../src/api/expenses';
import { ExpenseForm, ExpenseFormValues } from '../../../src/components/ExpenseForm';
import { SplitInput } from '../../../src/api/expenses';

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

export default function NewExpenseScreen() {
  const { serverUrl, token, group, myParticipantId } = useGroupContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: participants } = useParticipants(serverUrl, token);

  const handleSubmit = async (values: ExpenseFormValues) => {
    const splits = buildSplits(values);
    await createExpense(serverUrl, token, {
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
      participants={participants ?? []}
      group={group}
      serverUrl={serverUrl}
      token={token}
      onSubmit={handleSubmit}
      submitLabel="Add Expense"
      initialValues={{ paid_by_id: myParticipantId ?? '' }}
    />
  );
}
