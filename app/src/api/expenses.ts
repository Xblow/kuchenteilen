import { Expense } from '../types';
import { apiFetch, groupBase } from './client';

export interface SplitInput {
  participant_id: string;
  amount_cents?: number;
}

export interface ExpenseBody {
  paid_by_id: string;
  description: string;
  amount_cents: number;
  currency: string;
  date: string;
  split_type: 'equal' | 'exact';
  splits: SplitInput[];
}

export function listExpenses(serverUrl: string, token: string): Promise<Expense[]> {
  return apiFetch<Expense[]>(`${groupBase(serverUrl, token)}/expenses`);
}

export function createExpense(
  serverUrl: string,
  token: string,
  body: ExpenseBody,
): Promise<Expense> {
  return apiFetch<Expense>(`${groupBase(serverUrl, token)}/expenses`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function editExpense(
  serverUrl: string,
  token: string,
  recordId: string,
  body: ExpenseBody,
): Promise<Expense> {
  return apiFetch<Expense>(`${groupBase(serverUrl, token)}/expenses/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteExpense(
  serverUrl: string,
  token: string,
  recordId: string,
): Promise<void> {
  return apiFetch<void>(`${groupBase(serverUrl, token)}/expenses/${recordId}`, {
    method: 'DELETE',
  });
}

export function getExpenseHistory(
  serverUrl: string,
  token: string,
  recordId: string,
): Promise<Expense[]> {
  return apiFetch<Expense[]>(`${groupBase(serverUrl, token)}/expenses/${recordId}/history`);
}
