import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../sidebar/Sidebar";
import SnippetSidebar from "./SnippetSidebar";
import TitleBar from "./TitleBar";
import TabBar from "./TabBar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();

  const showSnippetSidebar = location.pathname.startsWith("/terminal") ||
                             location.pathname.startsWith("/sftp");

  return (
    <div className="flex flex-col h-full">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar />

          <main className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-auto">
              {children}
            </div>

            {showSnippetSidebar && <SnippetSidebar />}
          </main>
        </div>
      </div>
    </div>
  );
}
