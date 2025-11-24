import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import { Avatar } from "primereact/avatar";
import apiClient, { API_URL } from "../utils/api";
import { createAlertWebSocket } from "../utils/websocket";
import { useWebSocket } from "../hooks/useWebSocket";
import CameraView from "../components/CameraView";

interface Camera {
  id: number;
  name: string;
  location: string;
  ip_address: string;
  is_active: boolean;
  last_checked: string | null;
}

interface Incident {
  id: number;
  camera: Camera;
  camera_id: number;
  description: string;
  detected_by: string;
  timestamp: string;
  is_verified: boolean;
  type?: string;
}

interface Alert {
  id: number;
  title?: string;
  message: string;
  created_by: {
    id: number;
    username: string;
    email: string;
    role: string;
  } | null;
  created_at: string;
  acknowledged: boolean;
  incident?: Incident | null;
}

interface DashboardStats {
  total_cameras: number;
  active_cameras: number;
  incidents_today: number;
  recent_alerts: any[];
  last_reports: any[];
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => {
    // Sync with App.tsx theme
    const stored = localStorage.getItem("ai_theme_mode");
    const prefersDark =
      stored === "dark" ||
      (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    return prefersDark;
  });

  // Sync dark mode with App.tsx theme changes
  useEffect(() => {
    const checkTheme = () => {
      const stored = localStorage.getItem("ai_theme_mode");
      const isDark =
        stored === "dark" ||
        (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
      setDarkMode(isDark);
    };

    // Check on mount
    checkTheme();

    // Listen for storage changes (when theme is toggled in App.tsx from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "ai_theme_mode") {
        checkTheme();
      }
    };

    // Listen for custom theme change event (when theme is toggled in same tab)
    const handleThemeChange = () => {
      checkTheme();
    };

    // Listen for class changes on document (when App.tsx applies theme)
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark !== darkMode) {
        setDarkMode(isDark);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Poll for theme changes (fallback for same-tab changes)
    const interval = setInterval(() => {
      checkTheme();
    }, 1000);

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("themechange", handleThemeChange);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("themechange", handleThemeChange);
    };
  }, [darkMode]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [showAlertOverlay, setShowAlertOverlay] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [shownAlertIds, setShownAlertIds] = useState<Set<number>>(new Set());
  const [showCameraView, setShowCameraView] = useState(false);
  const [selectedCameraForView, setSelectedCameraForView] = useState<Camera | null>(null);
  
  // WebSocket for real-time alerts
  const [wsClient] = useState(() => createAlertWebSocket());
  const { isConnected, lastMessage, sendMessage } = useWebSocket(wsClient, {
    onConnect: () => {
      console.log("✅ WebSocket connected for dashboard alerts");
    },
    onDisconnect: () => {
      console.log("❌ WebSocket disconnected for dashboard alerts");
    },
    onError: (error) => {
      console.error("❌ WebSocket error:", error);
    },
  });

  const LIGHT_THEME =
    "https://unpkg.com/primereact/resources/themes/lara-light-indigo/theme.css";
  const DARK_THEME =
    "https://unpkg.com/primereact/resources/themes/lara-dark-indigo/theme.css";

  // === FETCH DATA ===
  const fetchCameras = async () => {
    try {
      const res = await apiClient.get(`/cameras/`);
      setCameras(res.data);
    } catch (err) {
      console.error("Failed to fetch cameras:", err);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await apiClient.get(`/incidents/`);
      setIncidents(res.data);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await apiClient.get<Alert[]>(`/alerts/`);
      const newAlerts = res.data;

      setAlerts(newAlerts);

      // Don't show overlay for initial fetch - only for new alerts via WebSocket
      // This prevents showing old alerts when page loads
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get(`/dashboard/stats/`);
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchCameras();
    fetchIncidents();
    fetchAlerts(); // Initial fetch for alerts
    fetchStats();

    // Keep polling for incidents and stats (alerts now use WebSocket)
    const interval = setInterval(() => {
      fetchIncidents();
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Handle WebSocket alert messages
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'alert') {
      return;
    }
    
    const alertData = lastMessage.data;
    
    if (alertData?.action === 'created') {
      // New alert created
      const newAlert = alertData.alert;
      console.log('🚨 New alert received via WebSocket:', newAlert);
      
      // Check if alert already exists
      setAlerts((prev) => {
        if (prev.some(a => a.id === newAlert.id)) {
          console.log('Alert already exists, skipping');
          return prev;
        }
        return [newAlert, ...prev];
      });
      
      // Show overlay for ALL unacknowledged alerts (urgent overlay)
      // Use functional update to avoid dependency on shownAlertIds
      if (!newAlert.acknowledged) {
        setShownAlertIds((prevIds) => {
          if (prevIds.has(newAlert.id)) {
            console.log('Alert already shown, skipping overlay');
            return prevIds;
          }
          console.log('✅ Showing urgent overlay for alert:', newAlert.id);
          setCurrentAlert(newAlert);
          setShowAlertOverlay(true);
          return new Set([...prevIds, newAlert.id]);
        });
      } else {
        console.log('Alert is acknowledged, not showing overlay');
      }
    } else if (alertData?.action === 'updated') {
      // Alert updated
      const updatedAlert = alertData.alert;
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === updatedAlert.id ? updatedAlert : alert
        )
      );
      
      // If the current alert was acknowledged, close overlay
      setCurrentAlert((current) => {
        if (updatedAlert.acknowledged && current?.id === updatedAlert.id) {
          setShowAlertOverlay(false);
          return null;
        }
        return current;
      });
    } else if (alertData?.action === 'deleted') {
      // Alert deleted - remove from list
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertData.alert.id));
    }
    // Only depend on lastMessage to prevent render loops
  }, [lastMessage]);

  // Keep WebSocket connection alive
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

  // === THEME ===
  const ensureThemeLink = () => {
    let link = document.getElementById("theme-link") as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = "theme-link";
      document.head.appendChild(link);
    }
    return link;
  };

  const applyTheme = (isDark: boolean) => {
    const link = ensureThemeLink();
    link.href = isDark ? DARK_THEME : LIGHT_THEME;

    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("ai_theme_mode");

    const prefersDark =
      stored === "dark" ||
      (stored === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    setDarkMode(prefersDark);
    applyTheme(prefersDark);
  }, []);

  // === ANALYSIS CONTROL ===
  const handleStartAnalysis = async () => {
    if (!selectedCamera) return alert("Select a camera first!");
    setIsAnalyzing(true);

    try {
      await apiClient.post(`/analysis/start/`, {
        camera_ids: [selectedCamera.id],
      });

      alert(`✅ YOLO detection started for ${selectedCamera.name}`);
    } catch (err) {
      console.error(err);
      alert("Failed to start analysis");
      setIsAnalyzing(false);
    }
  };

  const handleStopAnalysis = async () => {
    if (!selectedCamera) return;

    try {
      await apiClient.post(`/analysis/stop/`, {
        camera_ids: [selectedCamera.id],
      });

      alert(`🛑 YOLO detection stopped for ${selectedCamera.name}`);
      setIsAnalyzing(false);
    } catch (err) {
      console.error(err);
      alert("Failed to stop analysis");
    }
  };

  // === GET URGENCY ===
  const getAlertUrgency = (
    alert: Alert
  ): {
    level: "critical" | "high" | "medium" | "low";
    label: string;
    color: string;
    bgColor: string;
    icon: string;
    emoji: string;
    gradient: string;
    borderGlow: string;
  } => {
    const message = alert.message.toLowerCase();
    const incidentDesc = alert.incident?.description?.toLowerCase() || "";
    const combined = `${message} ${incidentDesc}`;

    if (
      combined.includes("weapon") ||
      combined.includes("knife") ||
      combined.includes("gun") ||
      (combined.includes("⚠️") &&
        (combined.includes("critical") || combined.includes("weapon")))
    ) {
      return {
        level: "critical",
        label: "CRITICAL",
        color: "text-red-50",
        bgColor: "bg-red-600",
        icon: "pi-exclamation-triangle",
        emoji: "🚨",
        gradient: "from-red-600 to-red-800",
        borderGlow: "shadow-[0_0_20px_rgba(239,68,68,0.6)]",
      };
    }

    if (
      combined.includes("bear") ||
      combined.includes("baseball bat") ||
      combined.includes("scissors") ||
      combined.includes("high risk") ||
      combined.includes("suspicious") ||
      (combined.includes("⚠️") && !combined.includes("weapon"))
    ) {
      return {
        level: "high",
        label: "HIGH",
        color: "text-orange-50",
        bgColor: "bg-orange-600",
        icon: "pi-exclamation-circle",
        emoji: "⚠️",
        gradient: "from-orange-600 to-orange-800",
        borderGlow: "shadow-[0_0_20px_rgba(249,115,22,0.5)]",
      };
    }

    if (
      combined.includes("person") ||
      combined.includes("backpack") ||
      combined.includes("suitcase") ||
      combined.includes("handbag") ||
      combined.includes("umbrella") ||
      combined.includes("medium")
    ) {
      return {
        level: "medium",
        label: "MEDIUM",
        color: "text-yellow-50",
        bgColor: "bg-yellow-600",
        icon: "pi-info-circle",
        emoji: "⚡",
        gradient: "from-yellow-600 to-yellow-800",
        borderGlow: "shadow-[0_0_20px_rgba(234,179,8,0.4)]",
      };
    }

    return {
      level: "low",
      label: "LOW",
      color: "text-blue-50",
      bgColor: "bg-blue-600",
      icon: "pi-bell",
      emoji: "ℹ️",
      gradient: "from-blue-600 to-blue-800",
      borderGlow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
    };
  };

  const acknowledgeAlert = async (alertId: number) => {
    try {
      await apiClient.patch(`/alerts/${alertId}/`, {
        acknowledged: true,
      });
      // WebSocket will automatically update the alert via the 'updated' message
      // No need to fetch again

      if (currentAlert?.id === alertId) {
        setShowAlertOverlay(false);
        setCurrentAlert(null);
      }
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
      alert("Failed to acknowledge alert");
    }
  };

  const dismissOverlay = () => {
    setShowAlertOverlay(false);
    setCurrentAlert(null);
  };

  // === RENDER ===
  return (
    <>
      {/* ========= MAIN CONTENT ========== */}
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen">
        <div className="flex h-[calc(100vh-5rem)]">
          {/* LEFT SIDE */}
          <div className="w-72 p-6 border-r border-gray-300 dark:border-gray-700 overflow-y-auto">
            <div className="space-y-4">
              {/* QUICK STATS */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`p-2 rounded-md text-center ${
                    darkMode ? "bg-gray-800" : "bg-gray-100"
                  }`}
                >
                  <i className="pi pi-video text-blue-500 text-sm mb-0.5 block"></i>
                  <div className="text-sm font-semibold">
                    {stats?.active_cameras || 0}
                  </div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-wide">
                    Active
                  </div>
                </div>

                <div
                  className={`p-2 rounded-md text-center ${
                    darkMode ? "bg-gray-800" : "bg-gray-100"
                  }`}
                >
                  <i className="pi pi-check-circle text-green-500 text-sm mb-0.5 block"></i>
                  <div className="text-sm font-semibold">
                    {alerts.filter((a) => a.acknowledged).length}
                  </div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-wide">
                    Approved
                  </div>
                </div>
              </div>

              {/* CAMERA CONTROL */}
              <Card className="shadow-lg">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-sm">Camera Control</h3>
                </div>

                <div className="p-3 space-y-2">
                  <Dropdown
                    value={selectedCamera}
                    options={cameras}
                    onChange={(e) => setSelectedCamera(e.value)}
                    optionLabel="name"
                    className="w-full"
                    placeholder="Select camera..."
                  />

                  <div className="flex gap-2">
                    <Button
                      label="Start"
                      icon="pi pi-play"
                      onClick={handleStartAnalysis}
                      disabled={!selectedCamera || isAnalyzing}
                      className="flex-1"
                    />

                    <Button
                      label="Stop"
                      icon="pi pi-stop"
                      onClick={handleStopAnalysis}
                      disabled={!selectedCamera || !isAnalyzing}
                      className="flex-1 p-button-danger"
                    />
                  </div>
                </div>
              </Card>

              {/* VIEW ALERTS */}
              <Card className="shadow-lg">
                <div className="p-3">
                  <Button
                    label="View All Alerts"
                    icon="pi pi-bell"
                    className="w-full"
                    onClick={() => navigate("/alerts")}
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* RIGHT SIDE - CAMERA FEED */}
          <div className="flex-1 p-6">
            <Card className="h-full shadow-xl">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Live Camera Feed</h2>

                  {isAnalyzing && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      YOLO Active
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 h-[calc(100%-5rem)]">
                {selectedCamera ? (
                  <div
                    onClick={() => {
                      setSelectedCameraForView(selectedCamera);
                      setShowCameraView(true);
                    }}
                    className="w-full h-full bg-black rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:border-primary transition-all duration-200 group relative"
                    title="Click to view fullscreen"
                  >
                    <img
                      src="http://127.0.0.1:5001/video_feed"
                      alt={selectedCamera.name}
                      className="max-w-full max-h-full object-contain group-hover:opacity-90 transition-opacity"
                    />

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm">
                      <i className="pi pi-expand"></i>
                      <span>Click for fullscreen</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <i className="pi pi-video text-6xl text-gray-400 mb-3 block"></i>
                      <p className="text-gray-500 text-sm">
                        Select a camera to view live stream
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* OVERLAY ALERT */}
      {showAlertOverlay && currentAlert && !currentAlert.acknowledged && (
        (() => {
          const urgency = getAlertUrgency(currentAlert);
          const isCritical = urgency.level === "critical";
          const isHigh = urgency.level === "high";

          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
              <div
                className={`absolute inset-0 backdrop-blur-md transition-all duration-300 ${
                  isCritical
                    ? "bg-red-950/70 pulse-glow-red"
                    : isHigh
                    ? "bg-orange-950/60"
                    : urgency.level === "medium"
                    ? "bg-yellow-950/50"
                    : "bg-blue-950/40"
                } ${isCritical ? "animate-pulse" : ""}`}
                onClick={dismissOverlay}
              ></div>

              <div
                className={`relative w-full max-w-xl z-[1110] transform transition-all duration-300 ${
                  isCritical
                    ? "animate-alert-critical"
                    : isHigh
                    ? "animate-alert-high"
                    : "animate-fade-in-up"
                }`}
                style={{ opacity: 1, maxHeight: '85vh', overflowY: 'auto' }}
              >
                <div
                  className={`rounded-2xl shadow-2xl overflow-hidden border-3 ${
                    urgency.level === "critical"
                      ? `border-red-500 ${darkMode ? 'pulse-glow-red' : ''}`
                      : urgency.level === "high"
                      ? `border-orange-500 ${darkMode ? 'pulse-glow-orange' : ''}`
                      : urgency.level === "medium"
                      ? "border-yellow-500"
                      : "border-blue-500"
                  }`}
                  style={{
                    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                    opacity: 1,
                    background: darkMode ? '#0f172a' : '#ffffff',
                    color: darkMode ? '#f1f5f9' : '#0f172a',
                    borderWidth: '3px',
                    boxShadow: urgency.level === "critical" 
                      ? darkMode ? '0 0 30px rgba(239, 68, 68, 0.5)' : '0 0 20px rgba(239, 68, 68, 0.3)'
                      : urgency.level === "high"
                      ? darkMode ? '0 0 30px rgba(249, 115, 22, 0.4)' : '0 0 20px rgba(249, 115, 22, 0.3)'
                      : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <Card
                    className="rounded-xl"
                    style={{
                      backgroundColor: 'transparent',
                      opacity: 1
                    }}
                    pt={{
                      root: { style: { backgroundColor: 'transparent', opacity: 1 } },
                      body: { style: { backgroundColor: 'transparent', opacity: 1, padding: 0 } },
                      content: { style: { backgroundColor: 'transparent', opacity: 1 } }
                    }}
                >
                  <div className="flex">
                    <div
                      className={`bg-gradient-to-b ${urgency.gradient} ${urgency.color} w-28 flex flex-col items-center justify-center p-6 relative ${
                        isCritical || isHigh ? "animate-pulse" : ""
                      }`}
                      style={{ 
                        opacity: 1,
                        boxShadow: darkMode ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 2px 4px rgba(255,255,255,0.2)'
                      }}
                    >
                      <div className="absolute top-2 right-2">
                        <span className={`text-3xl emoji-blink${isCritical ? '-fast' : ''}`}>
                          {urgency.emoji}
                        </span>
                      </div>
                      <i
                        className={`pi ${urgency.icon} text-4xl mb-2 ${
                          isCritical ? "animate-bounce" : isHigh ? "animate-pulse" : ""
                        }`}
                      ></i>
                      <div className="text-center mt-2">
                        <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-90">
                          Urgency
                        </div>
                        <div className="text-xl font-black drop-shadow-lg">
                          {urgency.label}
                        </div>
                      </div>
                    </div>

                    <div 
                      className="flex-1 p-6"
                      style={{
                        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                        opacity: 1,
                        color: darkMode ? '#f1f5f9' : '#0f172a'
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-5">
                            <div className={`relative ${urgency.bgColor} rounded-full p-3 shadow-lg`}>
                              <Avatar
                                icon={urgency.icon}
                                size="large"
                                shape="circle"
                                className={`${urgency.bgColor} text-white border-2 border-white/20`}
                              />
                              <span className={`absolute -top-1 -right-1 text-2xl emoji-blink${isCritical ? '-fast' : ''}`}>
                                {urgency.emoji}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`text-2xl font-extrabold ${
                                  darkMode ? 'text-slate-100' : 'text-slate-900'
                                }`}>
                                  Security Alert #{currentAlert.id}
                                </h3>
                                <span className={`text-xl emoji-blink${isCritical ? '-fast' : ''}`}>
                                  {urgency.emoji}
                                </span>
                              </div>
                              <p className={`text-sm font-medium ${
                                darkMode ? 'text-slate-400' : 'text-slate-600'
                              }`}>
                                <i className="pi pi-clock mr-1"></i>
                                {new Date(
                                  currentAlert.created_at
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`mb-5 p-5 rounded-xl border-l-4 shadow-md ${
                              urgency.level === "critical"
                                ? darkMode 
                                  ? "bg-gradient-to-r from-red-900/50 to-red-800/30 border-red-500"
                                  : "bg-gradient-to-r from-red-50 to-red-100/50 border-red-500"
                                : urgency.level === "high"
                                ? darkMode
                                  ? "bg-gradient-to-r from-orange-900/50 to-orange-800/30 border-orange-500"
                                  : "bg-gradient-to-r from-orange-50 to-orange-100/50 border-orange-500"
                                : urgency.level === "medium"
                                ? darkMode
                                  ? "bg-gradient-to-r from-yellow-900/50 to-yellow-800/30 border-yellow-500"
                                  : "bg-gradient-to-r from-yellow-50 to-yellow-100/50 border-yellow-500"
                                : darkMode
                                  ? "bg-gradient-to-r from-blue-900/50 to-blue-800/30 border-blue-500"
                                  : "bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-500"
                            }`}
                            style={{ 
                              opacity: 1,
                              borderLeftWidth: '5px'
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`text-2xl emoji-blink${isCritical ? '-fast' : ''} mt-0.5`}>
                                {urgency.emoji}
                              </span>
                              <p className={`text-base font-semibold leading-relaxed ${
                                darkMode ? 'text-slate-100' : 'text-slate-900'
                              }`}>
                                {currentAlert.message}
                              </p>
                            </div>
                          </div>

                          {currentAlert.incident && (
                            <>
                              {/* Camera Information */}
                              {currentAlert.incident.camera && (
                            <div
                                  className="mb-5 p-5 rounded-xl border shadow-md"
                                  style={{
                                    backgroundColor: darkMode ? '#1e293b' : '#f8fafc',
                                    borderColor: darkMode ? '#334155' : '#e2e8f0',
                                    opacity: 1,
                                    borderWidth: '2px'
                                  }}
                                >
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                      <i className="pi pi-video text-blue-500 text-lg"></i>
                                    </div>
                                    <p className={`text-base font-bold ${
                                      darkMode ? 'text-slate-200' : 'text-slate-800'
                                    }`}>
                                      Camera Information
                                    </p>
                                  </div>
                                  <div className="space-y-3">
                                    <div 
                                    className="flex items-center gap-3 p-2 rounded-lg"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                                    }}
                                  >
                                      <span className={`text-sm font-semibold min-w-[90px] ${
                                        darkMode ? 'text-slate-400' : 'text-slate-600'
                                      }`}>
                                        Name:
                                      </span>
                                      <span className={`text-sm font-medium ${
                                        darkMode ? 'text-slate-200' : 'text-slate-900'
                                      }`}>
                                        {currentAlert.incident.camera.name}
                                      </span>
                                    </div>
                                    <div 
                                    className="flex items-center gap-3 p-2 rounded-lg"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                                    }}
                                  >
                                      <span className={`text-sm font-semibold min-w-[90px] ${
                                        darkMode ? 'text-slate-400' : 'text-slate-600'
                                      }`}>
                                        Location:
                                      </span>
                                      <span className={`text-sm font-medium ${
                                        darkMode ? 'text-slate-200' : 'text-slate-900'
                                      }`}>
                                        {currentAlert.incident.camera.location}
                                      </span>
                                    </div>
                                    <div 
                                    className="flex items-center gap-3 p-2 rounded-lg"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                                    }}
                                  >
                                      <span className={`text-sm font-semibold min-w-[90px] ${
                                        darkMode ? 'text-slate-400' : 'text-slate-600'
                                      }`}>
                                        IP Address:
                                      </span>
                                      <span className={`text-sm font-medium font-mono ${
                                        darkMode ? 'text-slate-200' : 'text-slate-900'
                                      }`}>
                                        {currentAlert.incident.camera.ip_address}
                                      </span>
                                    </div>
                                    <div 
                                    className="flex items-center gap-3 p-2 rounded-lg"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                                    }}
                                  >
                                      <span className={`text-sm font-semibold min-w-[90px] ${
                                        darkMode ? 'text-slate-400' : 'text-slate-600'
                                      }`}>
                                        Status:
                                      </span>
                                      <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${
                                        currentAlert.incident.camera.is_active
                                          ? "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30"
                                          : "bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30"
                                      }`}>
                                        {currentAlert.incident.camera.is_active ? "✓ Active" : "✗ Inactive"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* View Camera Button */}
                              {currentAlert.incident?.camera && (
                                <div className="mb-5">
                                  <Button
                                    label={`View Camera: ${currentAlert.incident.camera.name}`}
                                    icon="pi pi-video"
                                    className="w-full p-button-lg shadow-lg hover:shadow-xl transition-all duration-200"
                                    style={{
                                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                      border: 'none',
                                      fontWeight: '600'
                                    }}
                                    onClick={() => {
                                      setSelectedCameraForView(currentAlert.incident!.camera);
                                      setShowCameraView(true);
                                    }}
                                  />
                                </div>
                              )}

                              {/* Incident Details */}
                              <div
                                className="mb-5 p-5 rounded-xl border shadow-md"
                                style={{
                                  backgroundColor: darkMode ? '#1e293b' : '#f8fafc',
                                  borderColor: darkMode ? '#334155' : '#e2e8f0',
                                  opacity: 1,
                                  borderWidth: '2px'
                                }}
                            >
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                  <i className="pi pi-info-circle text-blue-500 text-lg"></i>
                                </div>
                                <p className={`text-base font-bold ${
                                  darkMode ? 'text-slate-200' : 'text-slate-800'
                                }`}>
                                  Incident Details
                                </p>
                              </div>

                                <div className="space-y-3">
                              <p className={`text-sm leading-relaxed p-3 rounded-lg ${
                                darkMode ? 'text-slate-300 bg-slate-800/50' : 'text-slate-700 bg-slate-50'
                              }`}>
                                {currentAlert.incident.description}
                              </p>
                                  <div 
                                    className="flex items-center gap-3 p-2 rounded-lg"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                                    }}
                                  >
                                    <span className={`text-sm font-semibold min-w-[100px] ${
                                      darkMode ? 'text-slate-400' : 'text-slate-600'
                                    }`}>
                                      Detected by:
                                    </span>
                                    <span 
                                      className="text-sm px-3 py-1.5 rounded-full font-semibold border"
                                      style={{
                                        backgroundColor: currentAlert.incident.detected_by === "YOLO"
                                          ? darkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)'
                                          : currentAlert.incident.detected_by === "AI"
                                          ? darkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'
                                          : darkMode ? 'rgba(107, 114, 128, 0.2)' : 'rgba(107, 114, 128, 0.1)',
                                        color: currentAlert.incident.detected_by === "YOLO"
                                          ? darkMode ? '#a78bfa' : '#9333ea'
                                          : currentAlert.incident.detected_by === "AI"
                                          ? darkMode ? '#60a5fa' : '#2563eb'
                                          : darkMode ? '#9ca3af' : '#6b7280',
                                        borderColor: currentAlert.incident.detected_by === "YOLO"
                                          ? darkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.3)'
                                          : currentAlert.incident.detected_by === "AI"
                                          ? darkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.3)'
                                          : darkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(107, 114, 128, 0.3)'
                                      }}
                                    >
                                      {currentAlert.incident.detected_by}
                                    </span>
                                  </div>
                                  {currentAlert.incident.type && (
                                    <div 
                                    className="flex items-center gap-3 p-2 rounded-lg"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                                    }}
                                  >
                                      <span className={`text-sm font-semibold min-w-[100px] ${
                                        darkMode ? 'text-slate-400' : 'text-slate-600'
                                      }`}>
                                        Type:
                                      </span>
                                      <span className={`text-sm font-medium ${
                                        darkMode ? 'text-slate-200' : 'text-slate-900'
                                      }`}>
                                        {currentAlert.incident.type.replace('_', ' ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                            </div>
                            </>
                          )}

                          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Button
                              label="Dismiss"
                              icon="pi pi-times"
                              className="p-button-secondary p-button-lg shadow-md hover:shadow-lg transition-all duration-200"
                              onClick={dismissOverlay}
                            />

                            <Button
                              label="Acknowledge"
                              icon="pi pi-check"
                              className="p-button-success p-button-lg shadow-md hover:shadow-lg transition-all duration-200"
                              style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                border: 'none',
                                fontWeight: '600'
                              }}
                              onClick={() =>
                                acknowledgeAlert(currentAlert.id)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Camera View Dialog */}
      {showCameraView && (
        <CameraView
          visible={showCameraView}
          onHide={() => {
            setShowCameraView(false);
            setSelectedCameraForView(null);
          }}
          cameraId={selectedCameraForView?.id}
          cameraName={selectedCameraForView?.name || 'Camera Feed'}
          cameraIp={selectedCameraForView?.ip_address}
          darkMode={darkMode}
        />
      )}
    </>
  );
}
