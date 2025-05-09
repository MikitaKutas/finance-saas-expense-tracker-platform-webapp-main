import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/date-picker';
import { AmountInput } from '@/components/amount-input';
import { Select } from '@/components/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';

import { convertAmountToMilliUnits } from '@/lib/utils';

const formSchema = z.object({
  fromAccountId: z.string().min(1, { message: "Выберите счет отправителя" }),
  toAccountId: z.string().min(1, { message: "Выберите счет получателя" }),
  amount: z.string().min(1, { message: "Сумма обязательна" }),
  date: z.date(),
  notes: z.string().optional(),
}).refine(data => data.fromAccountId !== data.toAccountId, {
  message: "Счет отправителя и получателя должны быть разными",
  path: ["toAccountId"],
});

type FormValues = z.infer<typeof formSchema>;

export type ApiFormValues = Omit<FormValues, 'amount'> & {
  amount: number;
};

type Props = {
  id?: string;
  defaultValues?: FormValues;
  onSubmit: (values: ApiFormValues) => void;
  onDelete?: () => void;
  disabled?: boolean;
  accountOptions: { label: string; value: string }[];
};

export const TransferForm = ({
  id,
  defaultValues,
  onSubmit,
  onDelete,
  disabled,
  accountOptions,
}: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      date: new Date(),
      notes: '',
    },
  });

  const handleSubmit = (values: FormValues) => {
    const amount = parseFloat(values.amount);
    const amountInMilliUnits = convertAmountToMilliUnits(amount);
    onSubmit({
      ...values,
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
          name="date"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name="fromAccountId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Счет отправителя</FormLabel>
              <FormControl>
                <Select
                  placeholder="Выберите счет"
                  options={accountOptions}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name="toAccountId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Счет получателя</FormLabel>
              <FormControl>
                <Select
                  placeholder="Выберите счет"
                  options={accountOptions}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
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
              <FormLabel>Сумма</FormLabel>
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

        <FormField
          name="notes"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Примечания</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  disabled={disabled}
                  placeholder="Необязательные примечания"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button className="w-full" disabled={disabled}>
          {id ? 'Сохранить изменения' : 'Создать перевод'}
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
            <span className="ml-2">Удалить перевод</span>
          </Button>
        )}
      </form>
    </Form>
  );
}; 