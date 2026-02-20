import React from "react";
import { Route, Routes } from "react-router-dom";
import { CallbackPage } from "./pages/callback-page";
import LandingPage from "./pages/LandingPage";
import NotInDemo from "./pages/NotInDemo";
import Home from "./pages/Home";
import CourseDetailsPage from "./pages/CourseDetailsPage";
import ModuleDetailPage from "./pages/ModuleDetailPage";
import QuizResults from "./pages/QuizResults";
import AppEntry from "./pages/AppEntry";
import LtiRequired from "./pages/LtiRequired";
import Dashboard from "./pages/Dashboard";
import StaffEntry from "./pages/StaffEntry";
import ProtectedRoute from "./components/ProtectedRoute";


export const App = () => {
  return (
    <Routes>
      <Route
        path="/Home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <QuizResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseShortCode"
        element={
          <ProtectedRoute>
            <CourseDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/module/:moduleID"
        element={
          <ProtectedRoute>
            <ModuleDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/app" element={<AppEntry />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/staff" element={<StaffEntry />} />
      <Route path="/oauth2/callback" element={<StaffEntry />} />
      <Route path="/lti-required" element={<LtiRequired />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="*" element={<NotInDemo />} />
    </Routes>
  );
};
