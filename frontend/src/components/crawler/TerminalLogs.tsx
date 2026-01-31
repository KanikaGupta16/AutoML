import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LogEntry {
  id: number;
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

const sampleLogs: Omit<LogEntry, "id">[] = [
  { timestamp: "14:23:01", type: "info", message: "Initializing crawler for amazon.com/products..." },
  { timestamp: "14:23:02", type: "info", message: "Found 847 product listings" },
  { timestamp: "14:23:03", type: "success", message: "Downloaded page 1/42 (20 items)" },
  { timestamp: "14:23:04", type: "info", message: "Parsing product metadata..." },
  { timestamp: "14:23:05", type: "success", message: "Downloaded page 2/42 (20 items)" },
  { timestamp: "14:23:06", type: "warning", message: "Rate limit detected, backing off 2s..." },
  { timestamp: "14:23:08", type: "info", message: "Resuming crawl..." },
  { timestamp: "14:23:09", type: "success", message: "Downloaded page 3/42 (20 items)" },
  { timestamp: "14:23:10", type: "info", message: "Extracting pricing data..." },
  { timestamp: "14:23:11", type: "success", message: "Downloaded page 4/42 (20 items)" },
  { timestamp: "14:23:12", type: "error", message: "Failed to parse item SKU-2847 (retrying...)" },
  { timestamp: "14:23:13", type: "success", message: "Retry successful for SKU-2847" },
  { timestamp: "14:23:14", type: "success", message: "Downloaded page 5/42 (20 items)" },
  { timestamp: "14:23:15", type: "info", message: "Teaching the crawler your requirements..." },
  { timestamp: "14:23:16", type: "success", message: "Downloaded page 6/42 (20 items)" },
];

export function TerminalLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentIndex >= sampleLogs.length) {
      // Reset after a delay
      setTimeout(() => {
        setLogs([]);
        setCurrentIndex(0);
      }, 3000);
      return;
    }

    const timer = setTimeout(() => {
      const newLog = {
        ...sampleLogs[currentIndex],
        id: Date.now(),
      };
      setLogs((prev) => [...prev, newLog]);
      setCurrentIndex((prev) => prev + 1);
    }, 800 + Math.random() * 400);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
      case "error":
        return "text-error";
      default:
        return "text-terminal-foreground";
    }
  };

  const getTypePrefix = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "[OK]";
      case "warning":
        return "[WARN]";
      case "error":
        return "[ERR]";
      default:
        return "[INFO]";
    }
  };

  return (
    <div className="h-full flex flex-col bg-terminal rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-terminal-muted/20 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-error/80" />
          <div className="w-3 h-3 rounded-full bg-warning/80" />
          <div className="w-3 h-3 rounded-full bg-success/80" />
        </div>
        <span className="text-terminal-muted text-xs font-mono ml-2">
          crawler.log — bash
        </span>
      </div>

      <div
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-sm"
      >
        <AnimatePresence>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2 mb-1"
            >
              <span className="text-terminal-muted">{log.timestamp}</span>
              <span className={`${getTypeColor(log.type)} font-medium`}>
                {getTypePrefix(log.type)}
              </span>
              <span className="text-terminal-foreground">{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Blinking cursor */}
        <div className="flex items-center gap-1 mt-2">
          <span className="text-terminal-foreground">$</span>
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="w-2 h-4 bg-terminal-foreground"
          />
        </div>
      </div>
    </div>
  );
}
