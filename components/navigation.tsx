'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';
import { useMedia } from 'react-use';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import NavButton from '@/components/nav-button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { usePaywall } from '@/features/subscriptions/hooks/use-paywall';

const routes = [
  {
    href: '/',
    label: 'Главная',
  },
  {
    href: '/transactions',
    label: 'Операции',
  },
  {
    href: '/accounts',
    label: 'Счета',
  },
  {
    href: '/categories',
    label: 'Категории',
  },
  {
    href: '/planning',
    label: 'Планирование',
    requiresSubscription: true,
  },
  {
    href: '/settings',
    label: 'Настройки',
  },
];

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { shouldBlock, triggerPaywall } = usePaywall();

  const router = useRouter();
  const pathName = usePathname();
  const isMobile = useMedia('(max-width: 1024px)', false);

  const onClick = (href: string, requiresSubscription?: boolean) => {
    if (requiresSubscription && shouldBlock) {
      triggerPaywall();
      return;
    }
    router.push(href);
    setIsOpen(false);
  };

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger>
          <Button
            variant="outline"
            size="sm"
            className="font-normal bg-white/10 hover:bg-white/20 hover:text-white border-none focus-visible:ring-offset-0 focus-visible:ring-transparent outline-none text-white focus:bg-white/30 dark:bg-gray-800/20 dark:hover:bg-gray-800/30 transition"
          >
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="px-2">
          <nav className="flex flex-col gap-y-2 pt-6">
            {routes.map((route) => (
              <Button
                variant={route.href === pathName ? 'secondary' : 'ghost'}
                key={route.href}
                onClick={() => onClick(route.href, route.requiresSubscription)}
                className="w-full justify-start"
                disabled={route.requiresSubscription && shouldBlock}
              >
                {route.label}
              </Button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <nav className="hidden lg:flex items-center gap-x-2 overflow-x-auto">
      {routes.map((route) => (
        <NavButton
          key={route.href}
          href={route.href}
          label={route.label}
          isActive={pathName === route.href}
          disabled={route.requiresSubscription && shouldBlock}
          onClick={() => onClick(route.href, route.requiresSubscription)}
        />
      ))}
    </nav>
  );
};

export default Navigation;
