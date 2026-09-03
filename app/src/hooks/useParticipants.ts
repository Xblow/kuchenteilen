import { useQuery } from '@tanstack/react-query';
import { listParticipants } from '../api/participants';
import { Participant } from '../types';

export function useParticipants(serverUrl: string, token: string) {
  const query = useQuery({
    queryKey: ['participants', serverUrl, token],
    queryFn: () => listParticipants(serverUrl, token),
    staleTime: 5 * 60 * 1000,
  });

  const byId: Record<string, Participant> = {};
  if (query.data) {
    for (const p of query.data) {
      byId[p.id] = p;
    }
  }

  return { ...query, byId };
}
