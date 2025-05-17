import Link from 'next/link';

import { cn } from '@/lib/utils';
import { Button } from './ui/button';

type Props = {
  href: string;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

const NavButton = ({ href, label, isActive, disabled, onClick }: Props) => {
  return (
    <Button
      asChild={!onClick}
      size="sm"
      variant="outline"
      className={cn(
        'w-full lg:w-auto justify-between font-normal hover:bg-white/20 hover:text-white border-none focus-visible:ring-offset-0 focus-visible:ring-transparent outline-none text-white focus:bg-white/30 transition',
        isActive ? 'bg-white/10 text-white' : 'bg-transparent',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {onClick ? (
        <span>{label}</span>
      ) : (
        <Link href={href}>{label}</Link>
      )}
    </Button>
  );
};

export default NavButton;
