'use client';

import { useDeleteConnectedBank } from '@/features/plaid/api/use-delete-connected-bank';

import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';

export const PlaidDisconnect = () => {
  const [Dialog, confirm] = useConfirm(
    'Вы уверены?',
    'Это отключит ваш банковский счет и удалит все связанные данные.'
  );
  const deleteConnectedBank = useDeleteConnectedBank();

  const onClick = async () => {
    const ok = await confirm();

    if (ok) {
      deleteConnectedBank.mutate();
    }
  };

  return (
    <>
      <Dialog />
      <Button
        onClick={onClick}
        disabled={deleteConnectedBank.isPending}
        size="sm"
        variant="ghost"
      >
        Отключить
      </Button>
    </>
  );
};
