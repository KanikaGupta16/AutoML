import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Database,
  FileJson,
  Plus,
  MoreHorizontal,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const dataSources = [
  {
    id: "1",
    name: "Amazon Product API",
    type: "REST API",
    icon: Globe,
    status: "connected",
    lastSync: "2 hours ago",
    records: "12,453",
  },
  {
    id: "2",
    name: "Customer Database",
    type: "PostgreSQL",
    icon: Database,
    status: "connected",
    lastSync: "30 min ago",
    records: "89,234",
  },
  {
    id: "3",
    name: "Analytics Export",
    type: "JSON File",
    icon: FileJson,
    status: "error",
    lastSync: "Failed",
    records: "—",
  },
  {
    id: "4",
    name: "Competitor Prices",
    type: "Web Scraper",
    icon: Globe,
    status: "connected",
    lastSync: "1 day ago",
    records: "3,847",
  },
];

export default function DataSources() {
  return (
    <AppLayout title="Data Sources">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Connected Sources</h2>
            <p className="text-sm text-muted-foreground">
              Manage your data connections
            </p>
          </div>
          <Button className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        </div>

        <div className="grid gap-4">
          {dataSources.map((source) => (
            <Card key={source.id} className="border-border/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <source.icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">{source.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {source.type} • {source.records} records
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        {source.status === "connected" ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-error" />
                        )}
                        <Badge
                          variant="outline"
                          className={
                            source.status === "connected"
                              ? "status-completed"
                              : "status-error"
                          }
                        >
                          {source.status === "connected" ? "Connected" : "Error"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last sync: {source.lastSync}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
