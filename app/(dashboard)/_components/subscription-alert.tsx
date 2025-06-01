'use client';

import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { client } from '@/lib/hono';
import { formatCurrency } from '@/lib/utils';

interface SubscriptionAlertProps {
  date: Date;
}

type SubscriptionAnalysis = {
  hasSubscriptions: boolean;
  subscriptions: {
    description: string;
    amount: number;
    frequency: string;
  }[];
  message: string;
};

export const SubscriptionAlert = ({ date }: SubscriptionAlertProps) => {
  const { data: analysis } = useQuery<SubscriptionAnalysis>({
    queryKey: ['subscription-analysis', format(date, 'yyyy-MM')],
    queryFn: async () => {
      const response = await client.api.subscriptions.analyze.$get({
        query: {
          from: format(startOfMonth(date), 'yyyy-MM-dd'),
          to: format(endOfMonth(date), 'yyyy-MM-dd'),
        },
      });
      if (!response.ok) {
        throw new Error('Не удалось получить анализ подписок');
      }
      const { data } = await response.json();
      return data;
    },
  });

  if (!analysis?.hasSubscriptions) {
    return null;
  }

  return (
    <Alert variant="default" className="mb-4">
      <AlertCircle className="h-4 w-4 text-yellow-500" />
      <AlertTitle>AI помощник</AlertTitle>
      <AlertDescription>
        <p className="mb-2">{analysis.message}</p>
        <ul className="list-disc list-inside space-y-1">
          {analysis.subscriptions.map((subscription, index) => (
            <li key={index} className="text-sm">
              {subscription.description} - {formatCurrency(subscription.amount / 100)} ({subscription.frequency === 'monthly' ? 'ежемесячно' : 
                    subscription.frequency === 'weekly' ? 'еженедельно' : 'ежедневно'})
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}; 