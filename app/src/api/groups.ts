import { Group } from '../types';
import { apiFetch, groupBase, serverBase } from './client';

export function createGroup(
  serverUrl: string,
  body: { name: string; description: string; currency: string },
): Promise<Group> {
  return apiFetch<Group>(`${serverBase(serverUrl)}/groups`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getGroup(serverUrl: string, token: string): Promise<Group> {
  return apiFetch<Group>(groupBase(serverUrl, token));
}

export function updateGroup(
  serverUrl: string,
  token: string,
  body: { name: string; description: string },
): Promise<Group> {
  return apiFetch<Group>(groupBase(serverUrl, token), {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function addCurrency(
  serverUrl: string,
  token: string,
  currency: string,
): Promise<{ currencies: string[] }> {
  return apiFetch<{ currencies: string[] }>(`${groupBase(serverUrl, token)}/currencies`, {
    method: 'POST',
    body: JSON.stringify({ currency }),
  });
}

export function rotateToken(
  serverUrl: string,
  token: string,
): Promise<{ access_token: string }> {
  return apiFetch<{ access_token: string }>(`${groupBase(serverUrl, token)}/rotate`, {
    method: 'POST',
  });
}
