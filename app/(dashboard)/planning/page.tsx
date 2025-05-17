'use client';

import { useState } from 'react';
import { redirect } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

import { MonthSelector } from './_components/month-selector';
import { PlanningCharts } from './_components/planning-charts';
import { CreatePlan } from './_components/create-plan';

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
      <div className="flex items-center justify-between gap-4 mb-4">
        <MonthSelector date={date} onDateChange={setDate} />
        <CreatePlan />
      </div>
      <PlanningCharts date={date} />
    </div>
  );
};

export default PlanningPage; 