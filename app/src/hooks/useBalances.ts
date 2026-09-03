import { useQuery } from '@tanstack/react-query';
import { getBalances } from '../api/balances';

export function useBalances(serverUrl: string, token: string) {
  return useQuery({
    queryKey: ['balances', serverUrl, token],
    queryFn: () => getBalances(serverUrl, token),
    staleTime: 30 * 1000,
  });
}
