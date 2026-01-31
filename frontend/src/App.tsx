import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LiveCrawler from "./pages/LiveCrawler";
import ModelTraining from "./pages/ModelTraining";
import AIInterview from "./pages/AIInterview";
import DataSources from "./pages/DataSources";
import APIKeys from "./pages/APIKeys";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/crawler" element={<LiveCrawler />} />
          <Route path="/training" element={<ModelTraining />} />
          <Route path="/interview" element={<AIInterview />} />
          <Route path="/data-sources" element={<DataSources />} />
          <Route path="/api-keys" element={<APIKeys />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
