'use client';

import { ColumnDef } from '@tanstack/react-table';

import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/data-table-column-header';
import { DataTableRowActions } from '@/components/data-table-row-actions';
import { formatCurrency } from '@/lib/utils';

export type Plan = {
  id: string;
  type: 'savings' | 'spending';
  amount: number;
  month: string;
  accountId: string;
  account: {
    name: string;
  };
};

export const columns: ColumnDef<Plan>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Выбрать все"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Выбрать строку"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Тип" />
    ),
    cell: ({ row }) => {
      const type = row.getValue('type') as string;
      return (
        <div className="font-medium">
          {type === 'savings' ? 'Сбережения' : 'Расходы'}
        </div>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Сумма" />
    ),
    cell: ({ row }) => {
      const amount = row.getValue('amount') as number;
      return <div className="font-medium">{formatCurrency(amount)}</div>;
    },
  },
  {
    accessorKey: 'month',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Месяц" />
    ),
    cell: ({ row }) => {
      const month = row.getValue('month') as string;
      return (
        <div className="font-medium">
          {new Date(month).toLocaleDateString('ru-RU', {
            month: 'long',
            year: 'numeric',
          })}
        </div>
      );
    },
  },
  {
    accessorKey: 'account',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Счет" />
    ),
    cell: ({ row }) => {
      const account = row.original.account;
      return <div className="font-medium">{account.name}</div>;
    },
  },
  {
    id: 'actions',
    cell: () => <DataTableRowActions />,
  },
]; 