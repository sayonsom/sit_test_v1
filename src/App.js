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


export const App = () => {
  return (
    <Routes>
      <Route path="/Home" element={<Home />} />
      <Route path="/results" element={<QuizResults />} />
      <Route path="/courses" element={<Home />} />
      <Route path="/courses/:courseShortCode" element={<CourseDetailsPage />} />
      <Route path="/module/:moduleID" element={<ModuleDetailPage />} />
      <Route path="/app" element={<AppEntry />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/staff" element={<StaffEntry />} />
      <Route path="/oauth2/callback" element={<StaffEntry />} />
      <Route path="/lti-required" element={<LtiRequired />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="*" element={<NotInDemo />} />
    </Routes>
  );
};
