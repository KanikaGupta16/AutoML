import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const confusionData = [
  [842, 23, 15, 8],
  [18, 756, 31, 12],
  [9, 28, 689, 45],
  [5, 11, 38, 823],
];

const labels = ["Class A", "Class B", "Class C", "Class D"];

const getColor = (value: number, max: number, isDiagonal: boolean) => {
  const intensity = value / max;

  if (isDiagonal) {
    // Green for correct predictions
    if (intensity > 0.8) return "bg-success text-success-foreground";
    if (intensity > 0.5) return "bg-success/70 text-success-foreground";
    return "bg-success/40 text-success-foreground";
  } else {
    // Red/orange for errors
    if (intensity > 0.05) return "bg-error/60 text-error-foreground";
    if (intensity > 0.02) return "bg-warning/40 text-warning-foreground";
    return "bg-muted/50 text-muted-foreground";
  }
};

export function ConfusionMatrix() {
  const maxVal = Math.max(...confusionData.flat());

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Confusion Matrix</span>
          <span className="text-sm font-normal text-muted-foreground">
            Accuracy: 94.2%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex">
          {/* Y-axis label */}
          <div className="flex items-center justify-center -rotate-90 w-8">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Actual
            </span>
          </div>

          <div className="flex-1">
            {/* Matrix grid */}
            <div className="grid grid-cols-4 gap-1">
              {confusionData.map((row, i) =>
                row.map((value, j) => (
                  <div
                    key={`${i}-${j}`}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded-md text-sm font-medium transition-all hover:scale-105",
                      getColor(value, maxVal, i === j)
                    )}
                  >
                    {value}
                  </div>
                ))
              )}
            </div>

            {/* X-axis labels */}
            <div className="grid grid-cols-4 gap-1 mt-2">
              {labels.map((label) => (
                <div
                  key={label}
                  className="text-[10px] text-center text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* X-axis title */}
            <div className="text-center mt-2">
              <span className="text-xs text-muted-foreground">Predicted</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-success" />
            <span className="text-muted-foreground">Correct</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-error/60" />
            <span className="text-muted-foreground">Errors</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
