import { GroupBalances } from '../types';
import { apiFetch, groupBase } from './client';

export function getBalances(serverUrl: string, token: string): Promise<GroupBalances> {
  return apiFetch<GroupBalances>(`${groupBase(serverUrl, token)}/balances`);
}
