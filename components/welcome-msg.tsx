'use client';

import { useUser } from '@clerk/nextjs';

const WelcomeMsg = () => {
  const { user, isLoaded } = useUser();

  return (
    <div className="space-y-2 mb-4">
      <h2 className="text-2xl lg:text-4xl text-white dark:text-gray-100 font-medium">
        С возвращением{isLoaded && user?.firstName ? ", " : " "}{user?.firstName} 👋🏻
      </h2>
      <p className='text-sm lg:text-base text-[#89b6fd] dark:text-blue-300'>Это ваш финансовый отчет</p>
    </div>
  );
};

export default WelcomeMsg;
