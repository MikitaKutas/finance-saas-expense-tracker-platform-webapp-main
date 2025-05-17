'use client';

import {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';
import {Plus} from 'lucide-react';
import {format} from 'date-fns';

import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import {DatePicker} from '@/components/date-picker';
import {client} from '@/lib/hono';
import {formatCurrency} from '@/lib/utils';

type Account = {
  id: string;
  name: string;
  amount: number;
};

export const CreatePlan = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'savings' | 'spending'>('savings');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState<Date>();

  const queryClient = useQueryClient();

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await client.api.accounts.$get();

      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const { data } = await response.json();
      return data;
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!date) {
        throw new Error('Выберите дату');
      }

      const response = await client.api.plans.$post({
        json: {
          amount: Number(amount),
          type,
          accountId,
          month: format(date, 'yyyy-MM'),
        },
      });

      if (!response.ok) {
        throw new Error('Не удалось создать план');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('План создан');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: () => {
      toast.error('Не удалось создать план');
    },
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 size-4" />
          Создать план
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать план</DialogTitle>
          <DialogDescription>
            Создайте новый план для отслеживания ваших финансов
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Тип</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as 'savings' | 'spending')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Сбережения</SelectItem>
                  <SelectItem value="spending">Расходы</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Сумма</Label>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account">Счет</Label>
              <Select
                value={accountId}
                onValueChange={setAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите счет" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="month">Месяц</Label>
              <DatePicker
                value={date}
                onChange={setDate}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={isPending} type="submit">
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 