import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Database, Sparkles, FileText } from "lucide-react";

interface ProjectDetail {
  label: string;
  value: string;
  icon: React.ReactNode;
}

interface ProjectSidebarProps {
  details: {
    intent?: string;
    targetVariable?: string;
    dataSources?: string[];
    modelType?: string;
  };
}

export function ProjectSidebar({ details }: ProjectSidebarProps) {
  const items: ProjectDetail[] = [
    {
      label: "Project Intent",
      value: details.intent || "Not specified yet",
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      label: "Target Variable",
      value: details.targetVariable || "Awaiting input",
      icon: <Target className="w-4 h-4" />,
    },
    {
      label: "Model Type",
      value: details.modelType || "To be determined",
      icon: <FileText className="w-4 h-4" />,
    },
  ];

  return (
    <div className="h-full bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg">Project Details</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Extracted from conversation
        </p>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
        {items.map((item) => (
          <Card key={item.label} className="border-border/50">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                {item.icon}
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <p className="text-sm font-medium">
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Data Sources */}
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {details.dataSources && details.dataSources.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {details.dataSources.map((source) => (
                  <Badge
                    key={source}
                    variant="secondary"
                    className="text-xs"
                  >
                    {source}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No sources linked yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="p-4 border-t border-border bg-muted/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Details update as you chat
          </p>
        </div>
      </div>
    </div>
  );
}
