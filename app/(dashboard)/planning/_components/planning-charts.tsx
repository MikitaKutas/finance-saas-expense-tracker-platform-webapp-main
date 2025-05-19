'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Trash } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { client } from '@/lib/hono';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/use-confirm';
import { InferResponseType } from 'hono';
import { EditPlan } from './edit-plan';

interface PlanningChartsProps {
  date: Date;
}

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

type DeletePlanResponse = InferResponseType<
  (typeof client.api.plans)[':id']['$delete']
>;

export const PlanningCharts = ({ date }: PlanningChartsProps) => {
  const [ConfirmDialog, confirm] = useConfirm(
    'Удалить план',
    'Вы уверены, что хотите удалить этот план?'
  );
  const queryClient = useQueryClient();

  const { data: plansData } = useQuery<Plan[]>({
    queryKey: ['plans', format(date, 'yyyy-MM')],
    queryFn: async () => {
      const response = await client.api.plans.$get();
      if (!response.ok) {
        throw new Error('Не удалось получить планы');
      }
      const { data } = await response.json();
      return data;
    },
  });

  const { data: transactionsData } = useQuery({
    queryKey: ['transactions', format(date, 'yyyy-MM')],
    queryFn: async () => {
      const response = await client.api.transactions.$get({
        query: {
          from: format(startOfMonth(date), 'yyyy-MM-dd'),
          to: format(endOfMonth(date), 'yyyy-MM-dd'),
        },
      });
      if (!response.ok) {
        throw new Error('Не удалось получить транзакции');
      }
      const { data } = await response.json();
      return data;
    },
  });

  const deleteMutation = useMutation<DeletePlanResponse, Error, string>({
    mutationFn: async (id) => {
      const response = await client.api.plans[':id'].$delete({
        param: { id },
      });
      if (!response.ok) {
        throw new Error('Не удалось удалить план');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('План удален');
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: () => {
      toast.error('Не удалось удалить план');
    },
  });

  const onDelete = async (id: string) => {
    const ok = await confirm();
    if (ok) {
      deleteMutation.mutate(id);
    }
  };

  const currentMonth = format(date, 'yyyy-MM');
  const currentMonthPlans = plansData?.filter(
    plan => format(new Date(plan.month), 'yyyy-MM') === currentMonth
  );
  const spendingPlan = currentMonthPlans?.find(plan => plan.type === 'spending');
  const savingsPlan = currentMonthPlans?.find(plan => plan.type === 'savings');

  const days = eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  });

  const chartData = days.map(day => {
    const dayTransactions = transactionsData?.filter(
      transaction => format(new Date(transaction.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    ) || [];

    const spending = dayTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const income = dayTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      date: format(day, 'd', { locale: ru }),
      spending,
      savings: income - spending,
    };
  });

  // Накопление значений
  let accumulatedSpending = 0;
  let accumulatedSavings = 0;
  const accumulatedData = chartData.map(day => {
    accumulatedSpending += day.spending;
    accumulatedSavings += day.savings;
    return {
      ...day,
      spending: accumulatedSpending,
      savings: accumulatedSavings,
      spendingPlan: spendingPlan?.amount,
      savingsPlan: savingsPlan?.amount,
    };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value / 100);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-sm">
          <p className="text-sm font-medium">День {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          {payload[0].name === 'Расходы' && spendingPlan && (
            <p style={{ color: 'red' }}>
              План: {formatCurrency(spendingPlan.amount)}
            </p>
          )}
          {payload[0].name === 'Сбережения' && savingsPlan && (
            <p style={{ color: 'red' }}>
              План: {formatCurrency(savingsPlan.amount)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none drop-shadow-sm">
          <CardHeader>
            <CardTitle>Расходы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accumulatedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    formatter={(value) => value}
                    payload={[
                      { value: 'Расходы', type: 'line', color: '#8884d8' },
                      { value: 'План', type: 'line', color: 'red' },
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="spending"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Расходы"
                  />
                  {spendingPlan && (
                    <ReferenceLine
                      y={spendingPlan.amount}
                      stroke="red"
                      strokeDasharray="3 3"
                      label={{
                        value: 'План',
                        position: 'right',
                        fill: 'red',
                      }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none drop-shadow-sm">
          <CardHeader>
            <CardTitle>Сбережения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accumulatedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    formatter={(value) => value}
                    payload={[
                      { value: 'Сбережения', type: 'line', color: '#82ca9d' },
                      { value: 'План', type: 'line', color: 'red' },
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Сбережения"
                  />
                  {savingsPlan && (
                    <ReferenceLine
                      y={savingsPlan.amount}
                      stroke="red"
                      strokeDasharray="3 3"
                      label={{
                        value: 'План',
                        position: 'right',
                        fill: 'red',
                      }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none drop-shadow-sm">
        <CardHeader>
          <CardTitle>Планы на {format(date, 'LLLL yyyy', { locale: ru })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тип</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Счет</TableHead>
                <TableHead className="w-[100px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentMonthPlans?.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    {plan.type === 'spending' ? 'Расходы' : 'Сбережения'}
                  </TableCell>
                  <TableCell>{formatCurrency(plan.amount)}</TableCell>
                  <TableCell>{plan.account.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-x-2">
                      <EditPlan plan={plan} />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(plan.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!currentMonthPlans || currentMonthPlans.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Нет планов на этот месяц
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ConfirmDialog />
    </div>
  );
}; 