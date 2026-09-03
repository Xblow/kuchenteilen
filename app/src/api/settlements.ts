import { Settlement } from '../types';
import { apiFetch, groupBase } from './client';

export interface SettlementBody {
  payer_id: string;
  payee_id: string;
  amount_cents: number;
  currency: string;
  date: string;
  note: string;
}

export function listSettlements(serverUrl: string, token: string): Promise<Settlement[]> {
  return apiFetch<Settlement[]>(`${groupBase(serverUrl, token)}/settlements`);
}

export function createSettlement(
  serverUrl: string,
  token: string,
  body: SettlementBody,
): Promise<Settlement> {
  return apiFetch<Settlement>(`${groupBase(serverUrl, token)}/settlements`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteSettlement(
  serverUrl: string,
  token: string,
  settlementId: string,
): Promise<void> {
  return apiFetch<void>(`${groupBase(serverUrl, token)}/settlements/${settlementId}`, {
    method: 'DELETE',
  });
}
