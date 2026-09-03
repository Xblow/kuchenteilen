import { Participant } from '../types';
import { apiFetch, groupBase } from './client';

export function listParticipants(serverUrl: string, token: string): Promise<Participant[]> {
  return apiFetch<Participant[]>(`${groupBase(serverUrl, token)}/participants`);
}

export function createParticipant(
  serverUrl: string,
  token: string,
  name: string,
): Promise<Participant> {
  return apiFetch<Participant>(`${groupBase(serverUrl, token)}/participants`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function updateParticipant(
  serverUrl: string,
  token: string,
  participantId: string,
  name: string,
): Promise<void> {
  return apiFetch<void>(`${groupBase(serverUrl, token)}/participants/${participantId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export function deleteParticipant(
  serverUrl: string,
  token: string,
  participantId: string,
): Promise<void> {
  return apiFetch<void>(`${groupBase(serverUrl, token)}/participants/${participantId}`, {
    method: 'DELETE',
  });
}
