import { ReactNode } from "react";
import Sidebar from "../sidebar/Sidebar";
import TitleBar from "./TitleBar";
import TabBar from "./TabBar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Title bar (macOS style) */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar for sessions */}
          <TabBar />

          {/* Content */}
          <main className="flex-1 overflow-auto bg-white dark:bg-gray-900">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
