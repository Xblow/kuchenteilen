import { useQuery } from '@tanstack/react-query';
import { listExpenses } from '../api/expenses';

export function useExpenses(serverUrl: string, token: string) {
  return useQuery({
    queryKey: ['expenses', serverUrl, token],
    queryFn: () => listExpenses(serverUrl, token),
    staleTime: 30 * 1000,
  });
}
