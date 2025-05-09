import Header from "@/components/header";
import React from "react";

type Props = {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: Props) => {
  return (
    <>
      <Header />
      <main className="px-3 lg:px-14 bg-blue-100 dark:bg-blue-950 h-fit">
          <div className="-mt-20 transform -translate-y-32">
              {children}
          </div>
      </main>
    </>
  );
};

export default DashboardLayout;
