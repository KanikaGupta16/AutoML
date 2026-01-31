import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Copy, Eye, EyeOff, Trash2, Key } from "lucide-react";
import { useState } from "react";

const apiKeys = [
  {
    id: "1",
    name: "Production API",
    key: "ds_prod_a8f3k2m5n9p1q4r7t0w3x6y9z2",
    created: "Jan 15, 2024",
    lastUsed: "2 hours ago",
    status: "active",
  },
  {
    id: "2",
    name: "Development",
    key: "ds_dev_b2c5d8f1g4h7j0k3l6m9n2p5q8",
    created: "Jan 10, 2024",
    lastUsed: "5 min ago",
    status: "active",
  },
  {
    id: "3",
    name: "Testing Environment",
    key: "ds_test_c3d6e9f2g5h8i1j4k7l0m3n6o9",
    created: "Dec 20, 2023",
    lastUsed: "Never",
    status: "inactive",
  },
];

export default function APIKeys() {
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key: string) => {
    return key.slice(0, 10) + "•".repeat(20) + key.slice(-4);
  };

  return (
    <AppLayout title="API Keys">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">API Keys</h2>
            <p className="text-sm text-muted-foreground">
              Manage API access to your models
            </p>
          </div>
          <Button className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Create Key
          </Button>
        </div>

        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} className="border-border/50">
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{apiKey.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Created {apiKey.created} • Last used {apiKey.lastUsed}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      apiKey.status === "active"
                        ? "status-completed"
                        : "status-pending"
                    }
                  >
                    {apiKey.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={visibleKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                    readOnly
                    className="font-mono text-sm bg-muted/50"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleKeyVisibility(apiKey.id)}
                  >
                    {visibleKeys[apiKey.id] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(apiKey.key)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
