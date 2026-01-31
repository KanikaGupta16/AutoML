import { useState, createContext, useContext, ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  FolderKanban,
  Database,
  Settings,
  ChevronLeft,
  Zap,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const navigation = [
  { title: "Projects", url: "/", icon: FolderKanban },
  { title: "New Project", url: "/interview", icon: MessageSquare },
  { title: "Data Sources", url: "/sources", icon: Database },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
});

export const useSidebarState = () => useContext(SidebarContext);

function AppSidebarContent() {
  const { collapsed, setCollapsed } = useSidebarState();

  return (
    <Sidebar
      className={cn(
        "border-r border-sidebar-border transition-all duration-300 bg-sidebar",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <Link to="/" className={cn("flex items-center gap-3 group", collapsed && "justify-center w-full")}>
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-black text-lg text-sidebar-foreground tracking-tight">AutoML</span>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200",
                        collapsed && "justify-center px-2"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full p-2 mt-4 flex justify-center text-muted-foreground hover:text-sidebar-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

interface AppSidebarProps {
  children: ReactNode;
}

export function AppSidebar({ children }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebarContent />
          <main className="flex-1 flex flex-col min-h-screen">{children}</main>
        </div>
      </SidebarProvider>
    </SidebarContext.Provider>
  );
}
