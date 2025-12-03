import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { Avatar } from "primereact/avatar";
import { Message } from "primereact/message";
import apiClient, { API_URL } from "../utils/api";
import { createAlertWebSocket } from "../utils/websocket";
import { useWebSocket } from "../hooks/useWebSocket";

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
  ai_summary?: string | null;
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

export default function Alerts() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<"all" | "acknowledged" | "unacknowledged">("all");
  const [loading, setLoading] = useState(false);
  const [wsClient] = useState(() => createAlertWebSocket());
  const { isConnected, lastMessage, sendMessage } = useWebSocket(wsClient, {
    onConnect: () => {
      console.log("WebSocket connected for alerts");
    },
    onDisconnect: () => {
      console.log("WebSocket disconnected for alerts");
    },
  });

  const LIGHT_THEME =
    "https://unpkg.com/primereact/resources/themes/lara-light-indigo/theme.css";
  const DARK_THEME =
    "https://unpkg.com/primereact/resources/themes/lara-dark-indigo/theme.css";

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<Alert[]>(`/alerts/`);
      setAlerts(res.data);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchAlerts();
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'alert') {
      const alertData = lastMessage.data;
      
      if (alertData?.action === 'created') {
        // New alert created - add to the list
        const newAlert = alertData.alert;
        setAlerts((prev) => {
          // Check if alert already exists (avoid duplicates)
          if (prev.some(a => a.id === newAlert.id)) {
            return prev;
          }
          return [newAlert, ...prev];
        });
      } else if (alertData?.action === 'updated') {
        // Alert updated - update in the list
        const updatedAlert = alertData.alert;
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === updatedAlert.id ? updatedAlert : alert
          )
        );
      }
    }
  }, [lastMessage]);

  // Keep connection alive with ping
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

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
      (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(prefersDark);
    applyTheme(prefersDark);
  }, []);

  const toggleDarkMode = (v: boolean) => {
    setDarkMode(v);
    localStorage.setItem("ai_theme_mode", v ? "dark" : "light");
    applyTheme(v);
  };

  const acknowledgeAlert = async (alertId: number) => {
    try {
      await apiClient.patch(`/alerts/${alertId}/`, { acknowledged: true });
      // WebSocket will automatically update the alert via the 'updated' message
      // No need to fetch again
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
      alert("Failed to acknowledge alert");
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "acknowledged") return alert.acknowledged;
    if (filter === "unacknowledged") return !alert.acknowledged;
    return true;
  });

  const getDetectedByIcon = (detectedBy?: string) => {
    if (!detectedBy) return "🔔";
    switch (detectedBy) {
      case "YOLO":
        return "🤖";
      case "AI":
        return "✨";
      case "MANUAL":
        return "👤";
      default:
        return "🔍";
    }
  };

  const getRiskColor = (alert: Alert) => {
    if (alert.acknowledged) return "gray";
    if (alert.incident?.detected_by === "YOLO") return "red";
    if (alert.incident?.detected_by === "AI") return "orange";
    return "blue";
  };

  return (
    <>
      {/* MAIN CONTENT */}
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen">
        <div className="px-6 py-6">
          <Card className="shadow-lg w-full" style={{ fontSize: "15px" }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-xl">
                  {filter === "all"
                    ? "All Alerts"
                    : filter === "acknowledged"
                    ? "Resolved Alerts"
                    : "Active Alerts"}
                  <span className="ml-2 text-base text-gray-500">({filteredAlerts.length})</span>
                </h3>
                <Message
                  severity={isConnected ? "success" : "warn"}
                  text={isConnected ? "Live" : "Offline"}
                  className="text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  label="All"
                  className={filter === "all" ? "" : "p-button-outlined"}
                  onClick={() => setFilter("all")}
                  size="large"
                />
                <Button
                  label="Active"
                  className={filter === "unacknowledged" ? "" : "p-button-outlined"}
                  onClick={() => setFilter("unacknowledged")}
                  severity="danger"
                  size="large"
                />
                <Button
                  label="Resolved"
                  className={filter === "acknowledged" ? "" : "p-button-outlined"}
                  onClick={() => setFilter("acknowledged")}
                  severity="success"
                  size="large"
                />
              </div>
            </div>
            <div className="h-[calc(100vh-13rem)] overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="text-center py-10 text-gray-500">
                  <i className="pi pi-spin pi-spinner text-3xl mb-3 block"></i>
                  <p style={{ fontSize: "15px" }}>Loading alerts...</p>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <i className="pi pi-check-circle text-5xl mb-3 opacity-50 block"></i>
                  <p className="text-lg">No alerts found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border transition-all duration-200 flex flex-col md:flex-row md:items-center md:gap-6 gap-4
                        ${darkMode
                          ? alert.acknowledged
                            ? "bg-gray-800 border-gray-700 hover:bg-gray-700"
                            : "bg-gray-800 border-red-500/30 hover:border-red-500/50"
                          : alert.acknowledged
                          ? "bg-white border-gray-200 hover:bg-gray-50"
                          : "bg-white border-red-200 hover:border-red-300"
                        } ${alert.acknowledged ? "opacity-70" : ""}`}
                    >
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <Avatar
                          icon="pi pi-bell"
                          shape="circle"
                          className={`w-10 h-10 text-lg ${
                            alert.acknowledged
                              ? "bg-gray-500"
                              : getRiskColor(alert) === "red"
                              ? "bg-red-500"
                              : getRiskColor(alert) === "orange"
                              ? "bg-orange-500"
                              : "bg-blue-500"
                          } text-white`}
                        />
                        <span className="font-mono text-base text-gray-400">#{alert.id}</span>
                        {alert.acknowledged ? (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-sm font-medium">Resolved</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm font-medium animate-pulse">Active</span>
                        )}
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <i className="pi pi-clock"></i>
                          {new Date(alert.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className={`font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"} truncate`}>
                          {alert.message}
                        </div>
                        {alert.incident && (
                          <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-4">
                            <span>
                              <i className="pi pi-info-circle"></i> {alert.incident.description}
                            </span>
                            {alert.incident.ai_summary && (
                              <span className="block text-xs italic text-gray-400 w-full">AI: {alert.incident.ai_summary}</span>
                            )}
                            <span>
                              <i className="pi pi-video"></i> {alert.incident.camera.name}
                            </span>
                            <span>
                              {getDetectedByIcon(alert.incident.detected_by)}
                            </span>
                          </div>
                        )}
                      </div>
                      {!alert.acknowledged && (
                        <Button
                          label=""
                          icon="pi pi-check"
                          className="p-button-success p-button-lg p-2"
                          style={{ fontSize: "17px" }}
                          onClick={() => acknowledgeAlert(alert.id)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
