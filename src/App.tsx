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

            {/* Student routes */}
            <Route path="/dashboard" element={<ProtectedRoute role="oquvchi"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/test/yaratish" element={<ProtectedRoute role="oquvchi"><CreateTest /></ProtectedRoute>} />
            <Route path="/test/daraja" element={<ProtectedRoute role="oquvchi"><LevelTest /></ProtectedRoute>} />
            <Route path="/test/ai/run" element={<ProtectedRoute role="oquvchi"><TestRunner /></ProtectedRoute>} />
            <Route path="/test/:testId/run" element={<ProtectedRoute role="oquvchi"><TestRunner /></ProtectedRoute>} />
            <Route path="/natija" element={<ProtectedRoute role="oquvchi"><ResultPage /></ProtectedRoute>} />

            {/* Teacher routes */}
            <Route path="/oqituvchi" element={<ProtectedRoute role="oqituvchi"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/oqituvchi/yangi" element={<ProtectedRoute role="oqituvchi"><CreateTeacherTest /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
