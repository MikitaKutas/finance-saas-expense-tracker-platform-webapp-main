'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface MonthSelectorProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export const MonthSelector = ({
  date,
  onDateChange,
}: MonthSelectorProps) => {
  const handlePreviousMonth = () => {
    onDateChange(subMonths(date, 1));
  };

  const handleNextMonth = () => {
    onDateChange(addMonths(date, 1));
  };

  return (
    <Card className="border-none drop-shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-8">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold">
            {format(date, 'LLLL yyyy', { locale: ru })}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 