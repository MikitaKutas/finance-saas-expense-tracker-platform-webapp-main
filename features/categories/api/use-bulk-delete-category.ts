import {toast} from 'sonner';

import {InferRequestType, InferResponseType} from 'hono';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {client} from '@/lib/hono';

type ResponseType = InferResponseType<
  (typeof client.api.categories)['bulk-delete']['$post']
>;
type RequestType = InferRequestType<
  (typeof client.api.categories)['bulk-delete']['$post']
>['json'];

export const useBulkDeleteCategories = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.categories['bulk-delete']['$post']({
        json,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast.success('Категории удалены :)');
      // refetch all categories everytime you create a new category
      queryClient.invalidateQueries({queryKey: ['categories']});
      queryClient.invalidateQueries({queryKey: ['summary']});
    },
    onError: () => {
      toast.error('Не удалось удалить категории');
    },
  });
};
