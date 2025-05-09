import { z } from 'zod';
import { Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { AmountInput } from '@/components/amount-input';
import { convertAmountToMilliUnits } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  amount: z.string()
});

type FormValues = z.infer<typeof formSchema>;
type ApiFormValues = { name: string; amount: number };

type Props = {
  id?: string;
  defaultValues?: FormValues;
  onSubmit: (values: ApiFormValues) => void;
  onDelete?: () => void;
  disabled?: boolean;
};

export const AccountForm = ({
  id,
  defaultValues,
  onSubmit,
  onDelete,
  disabled,
}: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || { name: '', amount: '0' },
  });

  const handleSubmit = (values: FormValues) => {
    const amount = parseFloat(values.amount || '0');
    const amountInMilliUnits = convertAmountToMilliUnits(amount);
    
    onSubmit({
      name: values.name,
      amount: amountInMilliUnits,
    });
  };

  const handleDelete = () => {
    onDelete?.();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 pt-4"
      >
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название</FormLabel>
              <FormControl>
                <Input
                  disabled={disabled}
                  placeholder="например: Наличные, Банк, Кредитная карта"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          name="amount"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Остаток</FormLabel>
              <FormControl>
                <AmountInput
                  {...field}
                  disabled={disabled}
                  placeholder="0.00"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button className="w-full" disabled={disabled}>
          {id ? 'Сохранить изменения' : 'Создать счет'}
        </Button>

        {!!id && (
          <Button
            type="button"
            disabled={disabled}
            onClick={handleDelete}
            className="w-full"
            variant="outline"
          >
            <Trash className="size-4 mr-2" />
            <span className="ml-2">Удалить счет</span>
          </Button>
        )}
      </form>
    </Form>
  );
};
