import {toast} from 'sonner';

import {InferRequestType, InferResponseType} from 'hono';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {client} from '@/lib/hono';

type ResponseType = InferResponseType<typeof client.api.accounts.$post>;
type RequestType = InferRequestType<typeof client.api.accounts.$post>['json'];

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.accounts.$post({json});
      return await response.json();
    },
    onSuccess: () => {
      toast.success('Счет создан :)');
      // refetch all accounts everytime you create a new account
      queryClient.invalidateQueries({queryKey: ['accounts']});
    },
    onError: () => {
      toast.error('Не удалось создать счет');
    },
  });
};
