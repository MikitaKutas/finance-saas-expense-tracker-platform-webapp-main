import {toast} from 'sonner';

import {InferRequestType, InferResponseType} from 'hono';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {client} from '@/lib/hono';

type ResponseType = InferResponseType<typeof client.api.categories.$post>;
type RequestType = InferRequestType<typeof client.api.categories.$post>['json'];

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.categories.$post({json});
      return await response.json();
    },
    onSuccess: () => {
      toast.success('Категория создана :)');
      // re-fetch all categories everytime you create a new category
      queryClient.invalidateQueries({queryKey: ['categories']});
    },
    onError: () => {
      toast.error('Не удалось создать категорию');
    },
  });
};
