import { IconType } from 'react-icons';
import { VariantProps, cva } from 'class-variance-authority';
import { FaExclamationTriangle } from 'react-icons/fa';

import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import { CountUp } from '@/components/count-up';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const boxVariant = cva('rounded-md p-3', {
  variants: {
    variant: {
      default: 'bg-blue-500/20',
      success: 'bg-emerald-500/20',
      danger: 'bg-rose-500/20',
      warning: 'bg-yellow-500/20',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const iconVariant = cva('size-6', {
  variants: {
    variant: {
      default: 'fill-blue-500',
      success: 'fill-emerald-500',
      danger: 'fill-rose-500',
      warning: 'fill-yellow-500',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type BoxVariants = VariantProps<typeof boxVariant>;
type IconVariants = VariantProps<typeof iconVariant>;

interface DataCardProps extends BoxVariants, IconVariants {
  icon: IconType;
  title: string;
  value?: number;
  dateRange: string;
  percentageChange?: number;
}

export const DataCard = ({
  icon: Icon,
  title,
  value = 0,
  dateRange,
  variant,
  percentageChange = 0,
}: DataCardProps) => {
  const isNegative = value < 0;
  const displayVariant = isNegative && title === "Остаток" ? "danger" : variant;
  
  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader className="flex flew-row items-center justify-between gap-x-4">
        <div className="space-y-2">
          <CardTitle className="text-2xl line-clamp-1">{title}</CardTitle>
          <CardDescription className="line-clamp-1">
            {dateRange}
          </CardDescription>
        </div>

        <div className={cn(boxVariant({ variant: displayVariant }))}>
          <Icon className={cn(iconVariant({ variant: displayVariant }))} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <h1 className={cn(
            "font-bold text-2xl line-clamp-1 break-all",
            isNegative && title === "Остаток" && "text-rose-500"
          )}>
            <CountUp
              preserveValue
              start={0}
              end={value}
              decimals={2}
              decimalPlaces={2}
              formattingFn={formatCurrency}
            />
          </h1>
          {isNegative && title === "Остаток" && (
            <FaExclamationTriangle className="text-rose-500" />
          )}
        </div>
        <p
          className={cn(
            'text-muted-foreground text-sm line-clamp-1',
            percentageChange > 0 && 'text-emerald-500',
            percentageChange < 0 && 'text-rose-500'
          )}
        >
          {formatPercentage(percentageChange, { addPrefix: true })} с последнего изменения
        </p>
      </CardContent>
    </Card>
  );
};

export const DataCardLoading = () => {
  return (
    <Card className="border-none drop-shadow-sm h-[192px]">
      <CardHeader className="flex flex-row items-center justify-between gap-x-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="size-12" />
      </CardHeader>
      <CardContent>
        <Skeleton className="shrink-0 h-10 w-24 mb-2" />
        <Skeleton className="shrink-0 h-4 w-40" />
      </CardContent>
    </Card>
  );
};
