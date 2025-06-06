import {toast} from 'sonner';

import {InferResponseType} from 'hono';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {client} from '@/lib/hono';

type ResponseType = InferResponseType<
  (typeof client.api.transactions)[':id']['$delete']
>;

export const useDeleteTransaction = (id?: string) => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error>({
    mutationFn: async () => {
      const response = await client.api.transactions[':id']['$delete']({
        param: {id},
      });
      return await response.json();
    },
    onSuccess: () => {
      toast.success('Транзакция удалена :)');
      queryClient.invalidateQueries({queryKey: ['transaction', {id}]});
      queryClient.invalidateQueries({queryKey: ['transactions']});
      queryClient.invalidateQueries({queryKey: ['summary']});
    },
    onError: () => {
      toast.error('Не удалось удалить транзакцию');
    },
  });
};
