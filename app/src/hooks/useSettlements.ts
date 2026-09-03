import { useQuery } from '@tanstack/react-query';
import { listSettlements } from '../api/settlements';

export function useSettlements(serverUrl: string, token: string) {
  return useQuery({
    queryKey: ['settlements', serverUrl, token],
    queryFn: () => listSettlements(serverUrl, token),
    staleTime: 30 * 1000,
  });
}
