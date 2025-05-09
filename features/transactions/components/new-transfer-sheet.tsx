import { Loader2 } from 'lucide-react';

import { TransferForm, ApiFormValues } from '@/features/transactions/components/transfer-form';
import { useGetAccounts } from '@/features/accounts/api/use-get-accounts';
import { useCreateTransfer } from '@/features/transactions/api/use-create-transfer';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const NewTransferSheet = ({ isOpen, onClose }: Props) => {
  const createMutation = useCreateTransfer();

  const accountQuery = useGetAccounts();
  const accountOptions = (accountQuery.data ?? []).map((account) => ({
    label: account.name,
    value: account.id,
  }));

  const isPending = createMutation.isPending;
  const isLoading = accountQuery.isLoading;

  const onSubmit = (values: ApiFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="space-y-4">
        <SheetHeader>
          <SheetTitle>Новый перевод</SheetTitle>
          <SheetDescription>Перевод между счетами</SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-4 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <TransferForm
            onSubmit={onSubmit}
            disabled={isPending}
            accountOptions={accountOptions}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}; 