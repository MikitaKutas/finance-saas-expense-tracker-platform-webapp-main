'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Loader2, Sparkles } from 'lucide-react';

import { client } from '@/lib/hono';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { formatAmount } from '@/lib/utils';

type FinancialAdvice = {
  message: string;
  shortTermAdvice: string;
  longTermAdvice: string | null;
  isCritical: boolean;
};

interface AIAdviceModalProps {
  date: Date;
}

export const AIAdviceModal = ({ date }: AIAdviceModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: advice, isLoading } = useQuery<FinancialAdvice>({
    queryKey: ['financial-advice', format(date, 'yyyy-MM')],
    queryFn: async () => {
      const response = await client.api.plans.advice.$get({
        query: {
          from: format(startOfMonth(date), 'yyyy-MM-dd'),
          to: format(endOfMonth(date), 'yyyy-MM-dd'),
        },
      });
      if (!response.ok) {
        throw new Error('Не удалось получить финансовый совет');
      }
      const { data } = await response.json();
      return data;
    },
    enabled: isOpen,
  });

  const formatAdviceText = (text: string) => {
    // Заменяем все упоминания сумм в центах на доллары
    return text.replace(/(\d+) центов?/g, (match, cents) => {
      const dollars = formatAmount(parseInt(cents));
      return dollars;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Получить совет от AI помощника
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI помощник</DialogTitle>
          <DialogDescription>
            Анализ вашей финансовой ситуации и рекомендации
          </DialogDescription>
        </DialogHeader>
        <Separator />
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : advice ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Текущая ситуация</h3>
              <p className="text-sm text-muted-foreground">
                {formatAdviceText(advice.message)}
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <h3 className="font-medium">Рекомендации на текущий месяц</h3>
              <p className="text-sm text-muted-foreground">
                {formatAdviceText(advice.shortTermAdvice)}
              </p>
            </div>
            {advice.longTermAdvice && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-medium">Долгосрочные рекомендации</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatAdviceText(advice.longTermAdvice)}
                  </p>
                </div>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}; 