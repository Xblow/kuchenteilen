import { useQuery } from '@tanstack/react-query';
import { getGroup } from '../api/groups';

export function useGroup(serverUrl: string, token: string) {
  return useQuery({
    queryKey: ['group', serverUrl, token],
    queryFn: () => getGroup(serverUrl, token),
    staleTime: 5 * 60 * 1000,
  });
}
