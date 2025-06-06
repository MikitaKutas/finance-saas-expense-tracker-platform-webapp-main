import { useRef, useState } from 'react';

import { useGetAccounts } from '@/features/accounts/api/use-get-accounts';
import { useCreateAccount } from '@/features/accounts/api/use-create-account';

import { Select } from '@/components/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const useSelectAccount = (): [
  () => JSX.Element,
  () => Promise<unknown>
] => {
  const accountQuery = useGetAccounts();
  const accountMutation = useCreateAccount();

  const onCreateAccount = (name: string) => accountMutation.mutate({ name });

  const accountOptions = (accountQuery.data ?? []).map((account) => ({
    label: account.name,
    value: account.id,
  }));

  const [promise, setPromise] = useState<{
    resolve: (value: string | undefined) => void;
  } | null>(null);

  // the reason to use ref is changing the state causes the hook to re-render which will cause flashing effect on the Dialog
  const selectValue = useRef<string>();

  const confirm = () =>
    new Promise((resolve) => {
      setPromise({ resolve });
    });

  const handleClose = () => {
    setPromise(null);
  };

  const handleConfirm = () => {
    promise?.resolve(selectValue.current);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(undefined);
    handleClose();
  };

  const ConfirmationDialog = () => (
    <Dialog open={promise !== null}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Выберите счет</DialogTitle>
          <DialogDescription>
            Пожалуйста, выберите счет для продолжения
          </DialogDescription>
        </DialogHeader>
        <Select
          placeholder="Выберите счет"
          options={accountOptions}
          onCreate={onCreateAccount}
          onChange={(value) => (selectValue.current = value)}
          disabled={accountQuery.isLoading || accountMutation.isPending}
        />
        <DialogFooter className="pt-2">
          <Button onClick={handleCancel} variant="outline">
            Отмена
          </Button>
          <Button onClick={handleConfirm}>Подтвердить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return [ConfirmationDialog, confirm];
};
