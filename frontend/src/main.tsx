import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Landing from "./pages/landing.tsx";
import Dashboard from "./pages/dashboard.tsx";
import CameraSelect from "./pages/cameraselect.tsx";
import Alerts from "./pages/alerts.tsx";
import Reports from "./pages/reports.tsx";
import Profile from "./pages/profile.tsx";
import VideoDetectionTester from "./pages/video-tester.tsx";
import PageTransition from "./components/PageTransition";
import ProtectedRoute from "./components/ProtectedRoute";
import App from "./App";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import "./index.css";

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <Routes location={location} key={location.pathname}>
      <Route 
        path="/" 
        element={
          <PageTransition>
            <Landing />
          </PageTransition>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <App>
              <PageTransition>
                <Dashboard />
              </PageTransition>
            </App>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/cameras" 
        element={
          <ProtectedRoute>
            <App>
              <PageTransition>
                <CameraSelect />
              </PageTransition>
            </App>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/alerts" 
        element={
          <ProtectedRoute>
            <App>
              <PageTransition>
                <Alerts />
              </PageTransition>
            </App>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute>
            <App>
              <PageTransition>
                <Reports />
              </PageTransition>
            </App>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <App>
              <PageTransition>
                <Profile />
              </PageTransition>
            </App>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/video-test" 
        element={
          <ProtectedRoute>
            <App>
              <PageTransition>
                <VideoDetectionTester />
              </PageTransition>
            </App>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  </React.StrictMode>
);
