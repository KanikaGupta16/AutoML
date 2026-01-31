import { motion } from "framer-motion";
import { Globe, Database, FileJson, ShoppingCart, BarChart3, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DataSourceStatus = "pending" | "crawling" | "completed" | "error";

export interface DataSource {
  id: string;
  name: string;
  url: string;
  icon: "globe" | "database" | "json" | "ecommerce" | "analytics" | "users";
  status: DataSourceStatus;
  recordCount?: number;
}

const iconMap = {
  globe: Globe,
  database: Database,
  json: FileJson,
  ecommerce: ShoppingCart,
  analytics: BarChart3,
  users: Users,
};

const statusConfig: Record<
  DataSourceStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "status-pending" },
  crawling: { label: "Crawling", className: "status-crawling" },
  completed: { label: "Completed", className: "status-completed" },
  error: { label: "Error", className: "status-error" },
};

interface DataSourceListProps {
  sources: DataSource[];
  selectedId?: string;
  onSelect?: (source: DataSource) => void;
}

export function DataSourceList({ sources, selectedId, onSelect }: DataSourceListProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border/50">
        <h3 className="font-semibold text-card-foreground">Data Sources</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {sources.filter((s) => s.status === "completed").length}/{sources.length} completed
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {sources.map((source, index) => {
          const Icon = iconMap[source.icon];
          const status = statusConfig[source.status];

          return (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelect?.(source)}
              className={cn(
                "p-3 border-b border-border/30 cursor-pointer transition-colors",
                "hover:bg-muted/50",
                selectedId === source.id && "bg-muted"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    source.status === "crawling" ? "bg-info/10" : "bg-muted"
                  )}
                >
                  {source.status === "crawling" ? (
                    <div className="relative">
                      <Icon className="w-5 h-5 text-info" />
                      <motion.div
                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-info"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    </div>
                  ) : (
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        source.status === "completed"
                          ? "text-success"
                          : source.status === "error"
                          ? "text-error"
                          : "text-muted-foreground"
                      )}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-card-foreground truncate">
                      {source.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] shrink-0", status.className)}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {source.url}
                  </p>
                  {source.recordCount && (
                    <p className="text-xs text-success mt-1">
                      {source.recordCount.toLocaleString()} records
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
