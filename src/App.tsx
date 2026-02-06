import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuthPage from "./pages/auth/AuthPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminChatPage from "./pages/admin/AdminChatPage";
import AdminContentPage from "./pages/admin/AdminContentPage";
import AdminBookingsPage from "./pages/admin/AdminBookingsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminStatsPage from "./pages/admin/AdminStatsPage";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientProfile from "./pages/client/ClientProfile";
import ClientBookings from "./pages/client/ClientBookings";
import ClientNewBooking from "./pages/client/ClientNewBooking";
import ClientPasses from "./pages/client/ClientPasses";
import ClientPurchases from "./pages/client/ClientPurchases";
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
          <Route path="/auth" element={<AuthPage />} />
          {/* Client routes */}
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/client/profile" element={<ClientProfile />} />
          <Route path="/client/bookings" element={<ClientBookings />} />
          <Route path="/client/bookings/new" element={<ClientNewBooking />} />
          <Route path="/client/passes" element={<ClientPasses />} />
          <Route path="/client/purchases" element={<ClientPurchases />} />
          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/chat" element={<AdminChatPage />} />
          <Route path="/admin/content" element={<AdminContentPage />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/stats" element={<AdminStatsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
