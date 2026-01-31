import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  fullWidth?: boolean;
}

export function AppLayout({ children, title, fullWidth = false }: AppLayoutProps) {
  return (
    <AppSidebar>
      <AppHeader title={title} />
      <div className={`flex-1 bg-background ${fullWidth ? "" : "p-6"}`}>
        {children}
      </div>
    </AppSidebar>
  );
}
