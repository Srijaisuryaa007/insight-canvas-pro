import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { DataProvider } from "@/contexts/DataContext";

// Landing Page
import LandingPage from "./landing/LandingPage";

// Auth Pages
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

// Dashboard Pages
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import Datasets from "./pages/dashboard/Datasets";
import Quality from "./pages/dashboard/Quality";
import Insights from "./pages/dashboard/Insights";
import Visualizations from "./pages/dashboard/Visualizations";
import Copilot from "./pages/dashboard/Copilot";
import Reports from "./pages/dashboard/Reports";
import Settings from "./pages/dashboard/Settings";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WorkspaceProvider>
        <DataProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<Overview />} />
                  <Route path="datasets" element={<Datasets />} />
                  <Route path="quality" element={<Quality />} />
                  <Route path="insights" element={<Insights />} />
                  <Route path="visualizations" element={<Visualizations />} />
                  <Route path="copilot" element={<Copilot />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </DataProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
