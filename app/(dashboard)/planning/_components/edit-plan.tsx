'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/date-picker';
import { client } from '@/lib/hono';
import { formatCurrency } from '@/lib/utils';
import { InferResponseType } from 'hono';
import {Pencil} from "lucide-react";

type Account = {
  id: string;
  name: string;
  amount: number;
};

type Plan = {
  id: string;
  type: 'savings' | 'spending';
  amount: number;
  month: string;
  accountId: string;
  account: {
    name: string;
  };
};

type EditPlanResponse = InferResponseType<
  (typeof client.api.plans)[':id']['$patch']
>;

interface EditPlanProps {
  plan: Plan;
}

export const EditPlan = ({ plan }: EditPlanProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(plan.amount.toString());
  const [type, setType] = useState<'savings' | 'spending'>(plan.type);
  const [accountId, setAccountId] = useState(plan.accountId);
  const [date, setDate] = useState<Date>(new Date(plan.month));

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

  const { mutate, isPending } = useMutation<EditPlanResponse, Error>({
    mutationFn: async () => {
      const response = await client.api.plans[':id'].$patch({
        param: { id: plan.id },
        json: {
          amount: Number(amount),
          type,
          accountId,
          month: format(date, 'yyyy-MM'),
        },
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить план');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('План обновлен');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: () => {
      toast.error('Не удалось обновить план');
    },
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать план</DialogTitle>
          <DialogDescription>
            Измените параметры плана и нажмите сохранить
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Тип</Label>
              <Select
                value={type}
                onValueChange={(value: 'savings' | 'spending') => setType(value)}
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
                type="number"
                step="0.01"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account">Счет</Label>
              <Select value={accountId} onValueChange={setAccountId}>
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
              <Label>Месяц</Label>
              <DatePicker
                value={date}
                onChange={(date) => date && setDate(date)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 