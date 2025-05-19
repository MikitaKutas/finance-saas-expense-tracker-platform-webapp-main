'use client';

import { useState } from 'react';
import { redirect } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

import { MonthSelector } from './_components/month-selector';
import { PlanningCharts } from './_components/planning-charts';
import { CreatePlan } from './_components/create-plan';
import { AIAdviceModal } from './_components/ai-advice-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PlanningPage = () => {
  const { user, isLoaded } = useUser();
  const [date, setDate] = useState(new Date());

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
      <Card className="border-none drop-shadow-sm">
        <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-xl line-clamp-1">Планирование</CardTitle>
          <div className="flex items-center gap-x-2">
            <MonthSelector date={date} onDateChange={setDate} />
            <CreatePlan />
            <AIAdviceModal date={date} />
          </div>
        </CardHeader>
        <CardContent>
          <PlanningCharts date={date} />
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanningPage; 