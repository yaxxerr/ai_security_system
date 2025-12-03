import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { Avatar } from "primereact/avatar";
import { Divider } from "primereact/divider";
import { Message } from "primereact/message";
import { Dialog } from "primereact/dialog";
import axios from "axios";

interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

const API_URL = "http://127.0.0.1:8000/api";

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [visible, setVisible] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
  });

  const LIGHT_THEME =
    "https://unpkg.com/primereact/resources/themes/lara-light-indigo/theme.css";
  const DARK_THEME =
    "https://unpkg.com/primereact/resources/themes/lara-dark-indigo/theme.css";

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
    const newHref = isDark ? DARK_THEME : LIGHT_THEME;
    
    if (link.href !== newHref) {
      link.href = newHref;
    }
    
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
    setTimeout(() => {
      applyTheme(prefersDark);
    }, 10);

    // Show overlay when on profile route
    if (location.pathname === "/profile") {
      setVisible(true);
    }

    // Load user data
    loadUserData();
  }, [location.pathname]);

  const loadUserData = async () => {
    try {
      // Try to get user from localStorage first
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setFormData({
          username: userData.username || "",
          email: userData.email || "",
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
        });
      } else {
        // Try to fetch from API
        const token = localStorage.getItem("auth_token");
        if (token) {
          const response = await axios.get(`${API_URL}/users/me/`, {
            headers: { Authorization: `Token ${token}` },
          });
          setUser(response.data);
          setFormData({
            username: response.data.username || "",
            email: response.data.email || "",
            first_name: response.data.first_name || "",
            last_name: response.data.last_name || "",
          });
        } else {
          // Default user for demo
          const defaultUser: User = {
            id: 1,
            username: "admin",
            email: "admin@security.com",
            first_name: "Admin",
            last_name: "User",
            role: "Administrator",
          };
          setUser(defaultUser);
          setFormData({
            username: defaultUser.username,
            email: defaultUser.email,
            first_name: defaultUser.first_name || "",
            last_name: defaultUser.last_name || "",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      // Default user for demo
      const defaultUser: User = {
        id: 1,
        username: "admin",
        email: "admin@security.com",
        first_name: "Admin",
        last_name: "User",
        role: "Administrator",
      };
      setUser(defaultUser);
      setFormData({
        username: defaultUser.username,
        email: defaultUser.email,
        first_name: defaultUser.first_name || "",
        last_name: defaultUser.last_name || "",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = (v: boolean) => {
    setDarkMode(v);
    localStorage.setItem("ai_theme_mode", v ? "dark" : "light");
    applyTheme(v);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (token && user) {
        await axios.patch(
          `${API_URL}/users/${user.id}/`,
          formData,
          {
            headers: { Authorization: `Token ${token}` },
          }
        );
        setMessage({ severity: "success", text: "Profile updated successfully!" });
        // Update stored user
        const updatedUser = { ...user, ...formData };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        // For demo, just show success
        setMessage({ severity: "success", text: "Profile updated successfully!" });
        const updatedUser = { ...user!, ...formData };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error: any) {
      setMessage({
        severity: "error",
        text: error.response?.data?.message || "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.username) {
      return user.username[0].toUpperCase();
    }
    return "U";
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-950" : "bg-gray-50"}`}>
        <div className="text-center">
          <i className="pi pi-spin pi-spinner text-4xl text-primary"></i>
          <p className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Loading profile...</p>
        </div>
      </div>
    );
  }

  const handleClose = () => {
    setVisible(false);
    // Navigate back to previous page or dashboard
    if (location.pathname === "/profile") {
      navigate(-1);
    }
  };

  return (
    <Dialog
      visible={visible}
      onHide={handleClose}
      className={`${darkMode ? "p-dialog-dark" : ""}`}
      style={{ width: "90vw", maxWidth: "1200px" }}
      contentStyle={{ height: "90vh", maxHeight: "900px" }}
      draggable={false}
      resizable={false}
      modal
      closable
      dismissableMask
    >
      <div className={`h-full overflow-y-auto ${darkMode ? "bg-gray-900" : "bg-gray-50"} transition-colors duration-500`}>
        <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className={`text-3xl font-bold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
            Profile Settings
          </h1>
          <div className={`flex items-center gap-2 ${darkMode ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1`}>
            <i className="pi pi-sun text-yellow-500"></i>
            <InputSwitch checked={darkMode} onChange={(e) => toggleDarkMode(!!e.value)} />
            <i className="pi pi-moon text-blue-500"></i>
          </div>
        </div>

        {message && (
          <div className="mb-6 flex items-center gap-2">
            <Message
              severity={message.severity}
              text={message.text}
              className="flex-1"
            />
            <Button
              icon="pi pi-times"
              className="p-button-text p-button-rounded"
              onClick={() => setMessage(null)}
              aria-label="Close"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
            <div className="text-center py-6">
              <Avatar
                label={getInitials()}
                size="xlarge"
                shape="circle"
                className={`${darkMode ? "bg-gradient-to-br from-blue-600 to-purple-600" : "bg-gradient-to-br from-blue-500 to-purple-500"} text-white text-3xl mb-4`}
              />
              <h2 className={`text-2xl font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                {user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.username}
              </h2>
              <p className={`text-sm mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                {user?.email}
              </p>
              {user?.role && (
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                  darkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-700"
                }`}>
                  {user.role}
                </span>
              )}
            </div>
          </Card>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <Card className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
              <div className="p-6">
                <h3 className={`text-xl font-bold mb-6 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label
                      htmlFor="first_name"
                      className={`block mb-2 font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                    >
                      First Name
                    </label>
                    <InputText
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      className="w-full"
                      placeholder="First Name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="last_name"
                      className={`block mb-2 font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                    >
                      Last Name
                    </label>
                    <InputText
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      className="w-full"
                      placeholder="Last Name"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="username"
                    className={`block mb-2 font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                  >
                    Username
                  </label>
                  <InputText
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full"
                    placeholder="Username"
                  />
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="email"
                    className={`block mb-2 font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                  >
                    Email
                  </label>
                  <InputText
                    id="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full"
                    placeholder="Email"
                    type="email"
                  />
                </div>

                <Divider />

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    label="Cancel"
                    icon="pi pi-times"
                    outlined
                    onClick={() => loadUserData()}
                    className="px-6"
                  />
                  <Button
                    label={saving ? "Saving..." : "Save Changes"}
                    icon={saving ? "pi pi-spin pi-spinner" : "pi pi-check"}
                    onClick={handleSave}
                    loading={saving}
                    className="px-6"
                  />
                </div>
              </div>
            </Card>

            {/* Account Settings */}
            <Card className={`mt-6 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
              <div className="p-6">
                <h3 className={`text-xl font-bold mb-6 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                  Account Settings
                </h3>

                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold mb-1 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                          Change Password
                        </p>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Update your password to keep your account secure
                        </p>
                      </div>
                      <Button
                        label="Change"
                        icon="pi pi-key"
                        outlined
                        onClick={() => {
                          // You can implement password change dialog here
                          alert("Password change feature coming soon!");
                        }}
                      />
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold mb-1 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                          Two-Factor Authentication
                        </p>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <InputSwitch checked={false} disabled />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Logout Section */}
            <Card className={`mt-6 ${darkMode ? "bg-red-900/20 border-red-700" : "bg-red-50 border-red-200"}`}>
              <div className="p-6">
                <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                  Account Actions
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold mb-1 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                      Sign Out
                    </p>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Sign out of your account and return to the landing page
                    </p>
                  </div>
                  <Button
                    label="Logout"
                    icon="pi pi-sign-out"
                    severity="danger"
                    onClick={() => {
                      localStorage.removeItem("auth_token");
                      localStorage.removeItem("user");
                      navigate("/");
                    }}
                    className="px-6"
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </Dialog>
  );
}

