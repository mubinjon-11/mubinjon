import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import CreateTest from "./pages/CreateTest";
import LevelTest from "./pages/LevelTest";
import TestRunner from "./pages/TestRunner";
import ResultPage from "./pages/ResultPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import CreateTeacherTest from "./pages/CreateTeacherTest";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />

            {/* Student routes (admin can also access) */}
            <Route path="/dashboard" element={<ProtectedRoute role="oquvchi"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/test/yaratish" element={<ProtectedRoute role={["oquvchi", "admin"]}><CreateTest /></ProtectedRoute>} />
            <Route path="/test/daraja" element={<ProtectedRoute role={["oquvchi", "admin"]}><LevelTest /></ProtectedRoute>} />
            <Route path="/test/ai/run" element={<ProtectedRoute role={["oquvchi", "admin"]}><TestRunner /></ProtectedRoute>} />
            <Route path="/test/:testId/run" element={<ProtectedRoute role={["oquvchi", "admin"]}><TestRunner /></ProtectedRoute>} />
            <Route path="/natija" element={<ProtectedRoute role={["oquvchi", "admin"]}><ResultPage /></ProtectedRoute>} />

            {/* Teacher routes (admin can also access) */}
            <Route path="/oqituvchi" element={<ProtectedRoute role="oqituvchi"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/oqituvchi/yangi" element={<ProtectedRoute role={["oqituvchi", "admin"]}><CreateTeacherTest /></ProtectedRoute>} />

            {/* Admin route */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
