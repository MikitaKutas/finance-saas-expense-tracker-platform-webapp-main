import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { client } from '@/lib/hono';
import { ApiFormValues } from '@/features/transactions/components/transfer-form';

type ResponseType = {
  data?: {
    withdrawalId: string;
    depositId: string;
  };
  error?: string;
};

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, ApiFormValues>({
    mutationFn: async (json) => {
      const formattedJson = {
        ...json,
        date: json.date.toISOString(),
      };
      
      const response = await client.api.transfers.$post({ json: formattedJson });
      return await response.json();
    },
    onSuccess: () => {
      toast.success('Перевод успешно выполнен');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: () => {
      toast.error('Не удалось выполнить перевод');
    },
  });
}; 