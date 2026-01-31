import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DataPoint {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
}

const generateInitialData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  for (let i = 1; i <= 10; i++) {
    data.push({
      epoch: i,
      loss: 2.5 - (i * 0.15) + Math.random() * 0.1,
      accuracy: 0.3 + (i * 0.05) + Math.random() * 0.02,
      valLoss: 2.6 - (i * 0.14) + Math.random() * 0.15,
      valAccuracy: 0.28 + (i * 0.048) + Math.random() * 0.03,
    });
  }
  return data;
};

export function TrainingChart() {
  const [data, setData] = useState<DataPoint[]>(generateInitialData);
  const [currentEpoch, setCurrentEpoch] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentEpoch >= 50) return;

      const nextEpoch = currentEpoch + 1;
      const prevData = data[data.length - 1];

      const newPoint: DataPoint = {
        epoch: nextEpoch,
        loss: Math.max(0.1, prevData.loss - 0.08 + Math.random() * 0.06 - 0.03),
        accuracy: Math.min(0.98, prevData.accuracy + 0.015 + Math.random() * 0.01 - 0.005),
        valLoss: Math.max(0.15, prevData.valLoss - 0.07 + Math.random() * 0.08 - 0.04),
        valAccuracy: Math.min(0.96, prevData.valAccuracy + 0.012 + Math.random() * 0.015 - 0.0075),
      };

      setData((prev) => [...prev, newPoint]);
      setCurrentEpoch(nextEpoch);
    }, 1500);

    return () => clearInterval(interval);
  }, [currentEpoch, data]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Training Progress</span>
          <span className="text-sm font-normal text-muted-foreground">
            Epoch {currentEpoch}/50
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="epoch"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                domain={[0, 3]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                domain={[0, 1]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="loss"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
                name="Train Loss"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="valLoss"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Val Loss"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="accuracy"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                dot={false}
                name="Train Acc"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="valAccuracy"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Val Acc"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
