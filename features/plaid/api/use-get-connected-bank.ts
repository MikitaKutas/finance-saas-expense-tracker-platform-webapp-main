import {useQuery} from '@tanstack/react-query';

import {client} from '@/lib/hono';

export const useGetConnectedBank = () => {
  return useQuery({
    queryKey: ['connected-bank'],
    queryFn: async () => {
      const response = await client.api.plaid['connected-bank'].$get();

      if (!response.ok) {
        throw new Error('Failed to fetch connected bank');
      }

      const {data} = await response.json();
      return data;
    },
  });
};
