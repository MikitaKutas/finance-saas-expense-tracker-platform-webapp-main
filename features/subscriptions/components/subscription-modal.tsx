import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';

import { useCheckoutSubscription } from '@/features/subscriptions/api/use-checkout-subscription';
import { useSubscriptionModal } from '@/features/subscriptions/hooks/use-subscription-modal';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export const SubscriptionModal = () => {
  const checkout = useCheckoutSubscription();

  const { isOpen, onClose } = useSubscriptionModal();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader className="flex items-center space-y-4">
          <Image src="/logo-dark.svg" alt="Logo" width={36} height={36} />
          <DialogTitle className="text-center">
            Переход на платный план
          </DialogTitle>
          <DialogDescription className="text-center">
            Перейдите на платный план, чтобы разблокировать больше функций
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <ul className="space-y-2">
          <li className="flex items-center">
            <CheckCircle2 className="size-5 mr-2 fill-blue-500 text-white" />
            <p className="text-sm text-muted-foreground">
              Синхронизация банковского счета
            </p>
          </li>
          <li className="flex items-center">
            <CheckCircle2 className="size-5 mr-2 fill-blue-500 text-white" />
            <p className="text-sm text-muted-foreground">Загрузка CSV файлов</p>
          </li>
          <li className="flex items-center">
            <CheckCircle2 className="size-5 mr-2 fill-blue-500 text-white" />
            <p className="text-sm text-muted-foreground">
              Разные типы графиков
            </p>
          </li>
        </ul>
        <DialogFooter className="pt-2 mt-4 gap-y-2">
          <Button
            className="w-full"
            disabled={checkout.isPending}
            onClick={() => checkout.mutate()}
          >
            Улучшить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
