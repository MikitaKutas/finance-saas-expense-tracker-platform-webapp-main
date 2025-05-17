'use client';

import { useQuery } from '@tanstack/react-query';

import { DataTable } from '@/components/data-table';
import { client } from '@/lib/hono';
import { columns } from './columns';

export const DataTablePlans = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await client.api.plans.$get();
      
      if (!response.ok) {
        throw new Error('Не удалось получить планы');
      }

      const { data } = await response.json();
      return data;
    },
  });

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  if (error) {
    return <div>Ошибка при загрузке планов</div>;
  }

  if (!data || data.length === 0) {
    return <div>У вас пока нет планов</div>;
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      filterKey="type"
      onDelete={() => {}}
      disabled={false}
    />
  );
}; 