import React from "react";
import GridShape from "../../components/common/GridShape";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:grid">
          <div className="relative flex items-center justify-center z-1">
            {/* <!-- ===== Common Grid Shape Start ===== --> */}
            <GridShape />
            <div className="flex flex-col items-center gap-4 px-6 w-full max-w-xl">
              <img
                src="/images/logo/i3-l-logo-light.png"
                alt="i3systems"
                className="h-auto w-[min(22rem,88vw)] sm:w-[min(26rem,85vw)] lg:w-[min(30rem,80%)] object-contain"
                width={480}
                height={96}
              />
              <p className="text-center text-sm text-gray-400 sm:text-base dark:text-white/60">
                Intelligent Image & Information System
              </p>
            </div>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}