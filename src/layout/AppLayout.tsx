import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex h-full min-h-0 max-h-screen flex-1 flex-col transition-all duration-300 ease-in-out bg-white dark:bg-gray-900 ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div
          data-app-main-scroll
          className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/90 dark:bg-gray-900/90"
        >
          <div className="mx-auto min-w-0 max-w-(--breakpoint-2xl) p-4 md:p-6 ">
          <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;