import { Upload } from 'lucide-react';
import { useCSVReader } from 'react-papaparse';

import { usePaywall } from '@/features/subscriptions/hooks/use-paywall';

import { Button } from '@/components/ui/button';

type Props = {
  onUpload: (results: any) => void;
};

export const UploadButton = ({ onUpload }: Props) => {
  const { CSVReader } = useCSVReader();
  const { shouldBlock, triggerPaywall } = usePaywall();

  if (shouldBlock) {
    return (
      <Button size="sm" className="w-full lg:w-auto" onClick={triggerPaywall} variant="outline">
        <Upload className="size-4 mr-2" />
        Импортировать
      </Button>
    );
  }

  return (
    <CSVReader onUploadAccepted={onUpload}>
      {({ getRootProps }: any) => (
        <Button size="sm" className="w-full lg:w-auto" variant="outline" {...getRootProps()}>
          <Upload className="size-4 mr-2" />
          Импортировать
        </Button>
      )}
    </CSVReader>
  );
};
