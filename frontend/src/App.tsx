import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "primereact/button";
import { Sidebar } from "primereact/sidebar";
import { Menubar } from "primereact/menubar";
import { Avatar } from "primereact/avatar";
import { Menu } from "primereact/menu";
import { Dialog } from "primereact/dialog";
import { TabView, TabPanel } from "primereact/tabview";
import { Divider } from "primereact/divider";
import { ScrollPanel } from "primereact/scrollpanel";
import { InputSwitch } from "primereact/inputswitch";

interface AppProps {
  children: React.ReactNode;
}

export default function App({ children }: AppProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);
  const menuRef = useRef<any>(null);

  useEffect(() => {
    // Load user from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // Default user
        setUser({ username: "admin", email: "admin@security.com" });
      }
    } else {
      // Default user for demo
      setUser({ username: "admin", email: "admin@security.com" });
    }

    // Load dark mode preference
    const stored = localStorage.getItem("ai_theme_mode");
    const prefersDark =
      stored === "dark" ||
      (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(prefersDark);
    applyTheme(prefersDark);
  }, []);

  const LIGHT_THEME =
    "https://unpkg.com/primereact/resources/themes/lara-light-indigo/theme.css";
  const DARK_THEME =
    "https://unpkg.com/primereact/resources/themes/lara-dark-indigo/theme.css";

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

  const toggleDarkMode = (v: boolean) => {
    setDarkMode(v);
    localStorage.setItem("ai_theme_mode", v ? "dark" : "light");
    applyTheme(v);
  };

  const navItems = [
    {
      label: "Dashboard",
      icon: "pi pi-home",
      command: () => {
        navigate("/dashboard");
        setSidebarVisible(false);
      },
    },
    {
      label: "Cameras",
      icon: "pi pi-video",
      command: () => {
        navigate("/cameras");
        setSidebarVisible(false);
      },
    },
    {
      label: "Alerts",
      icon: "pi pi-bell",
      command: () => {
        navigate("/alerts");
        setSidebarVisible(false);
      },
    },
    {
      label: "Reports",
      icon: "pi pi-file",
      command: () => {
        navigate("/reports");
        setSidebarVisible(false);
      },
    },
    {
      label: "Video Test",
      icon: "pi pi-play",
      command: () => {
        navigate("/video-test");
        setSidebarVisible(false);
      },
    },
    {
      label: "Profile",
      icon: "pi pi-user",
      command: () => {
        navigate("/profile");
        setSidebarVisible(false);
      },
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    localStorage.removeItem("authenticated");
    setUser(null);
    setShowProfileOverlay(false);
    navigate("/");
  };

  const userMenuItems = [
    {
      label: "Profile",
      icon: "pi pi-user",
      command: () => {
        navigate("/profile");
      },
    },
    {
      separator: true,
    },
    {
      label: "Logout",
      icon: "pi pi-sign-out",
      command: handleLogout,
    },
  ];

  const start = (
    <div className="flex align-items-center gap-3">
      <Button
        icon="pi pi-bars"
        onClick={() => setSidebarVisible(true)}
        className="p-button-text"
        aria-label="Toggle Menu"
      />
      <h1 className="text-xl font-bold m-0">
        AI Security System
      </h1>
    </div>
  );

  const end = (
    <div className="flex align-items-center gap-3">
      <span className="font-semibold hidden md:inline-block">Security Dashboard</span>
      
      {/* Dark/Light Mode Toggle */}
      <div className={`flex align-items-center gap-2 ${darkMode ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1`}>
        <i className="pi pi-sun text-yellow-500"></i>
        <InputSwitch checked={darkMode} onChange={(e) => toggleDarkMode(!!e.value)} />
        <i className="pi pi-moon text-blue-500"></i>
      </div>

      {/* Profile Avatar */}
      <div className="relative">
        <Button
          className="p-button-text p-button-rounded"
          onClick={() => {
            // Show profile overlay on click
            setShowProfileOverlay(true);
          }}
          onContextMenu={(e) => {
            // Show menu on right-click
            e.preventDefault();
            menuRef.current?.toggle(e);
          }}
          aria-label="User Profile"
        >
          <Avatar
            label={user?.username?.[0]?.toUpperCase() || "U"}
            shape="circle"
            className="bg-gradient-to-br from-blue-500 to-purple-500 text-white cursor-pointer hover:opacity-80 transition-opacity"
          />
        </Button>
        <Menu
          ref={menuRef}
          model={userMenuItems}
          popup
          className="mt-2"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Menubar start={start} end={end} className="shadow-sm" />
      
      <Sidebar
        visible={sidebarVisible}
        onHide={() => setSidebarVisible(false)}
        modal={false}
        position="left"
        className="w-64"
      >
        <div className="flex flex-column gap-2 pt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.command.toString().match(/\/\w+/)?.[0] ||
              (item.label === "Dashboard" && location.pathname === "/");
            
            return (
              <Button
                key={item.label}
                label={item.label}
                icon={item.icon}
                iconPos="left"
                className={`p-button-text p-button-lg justify-content-start ${
                  isActive ? "text-blue-600" : ""
                }`}
                onClick={item.command}
              />
            );
          })}
        </div>
      </Sidebar>

      <main className="p-4">
        {children}
      </main>

      {/* Profile Overlay */}
      <Dialog
        visible={showProfileOverlay}
        onHide={() => setShowProfileOverlay(false)}
        style={{ width: "90vw", maxWidth: "900px" }}
        contentStyle={{ height: "85vh", maxHeight: "750px", padding: "0" }}
        draggable={false}
        resizable={false}
        modal
        closable={false}
        dismissableMask
        header={
          <div className="flex align-items-center justify-content-between w-full p-3">
            <h2 className="text-2xl font-bold m-0">User Menu</h2>
            <Button
              icon="pi pi-times"
              className="p-button-text p-button-rounded"
              onClick={() => setShowProfileOverlay(false)}
              aria-label="Close"
            />
          </div>
        }
      >
        <div className={`h-full ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
          <TabView className="h-full">
            {/* Profile Tab */}
            <TabPanel header="Profile" leftIcon="pi pi-user">
              <ScrollPanel style={{ height: "calc(85vh - 120px)", maxHeight: "630px" }} className="custombar1">
                <div className="p-6">
                  <div className="text-center mb-4">
                    <Avatar
                      label={user?.username?.[0]?.toUpperCase() || "U"}
                      size="xlarge"
                      shape="circle"
                      className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-4xl mb-3"
                    />
                    <h1 className={`text-xl font-bold mb-1 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                      {user?.first_name && user?.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user?.username || "User"}
                    </h1>
                    <p className={`text-sm mb-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {user?.email || "No email"}
                    </p>
                    {user?.role && (
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        darkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-700"
                      }`}>
                        {user.role}
                      </span>
                    )}
                  </div>

                  <Divider className="my-4" />

                  <div className="flex flex-column gap-3 mb-4">
                    <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
                      <div className="flex align-items-center justify-content-between">
                        <span className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-900"}`}>Username</span>
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>{user?.username || "N/A"}</span>
                      </div>
                    </div>
                    <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
                      <div className="flex align-items-center justify-content-between">
                        <span className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-900"}`}>Email</span>
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>{user?.email || "N/A"}</span>
                      </div>
                    </div>
                    {user?.first_name && (
                      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
                        <div className="flex align-items-center justify-content-between">
                          <span className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-900"}`}>Full Name</span>
                          <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
                            {user.first_name} {user.last_name || ""}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-column gap-3 mt-4">
                    <Button
                      label="Edit Profile Settings"
                      icon="pi pi-pencil"
                      className="w-full"
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/profile");
                      }}
                    />
                    <Button
                      label="Logout"
                      icon="pi pi-sign-out"
                      className="w-full"
                      severity="danger"
                      onClick={handleLogout}
                    />
                  </div>
                </div>
              </ScrollPanel>
            </TabPanel>

            {/* How to Use Platform Tab */}
            <TabPanel header="How to Use" leftIcon="pi pi-question-circle">
              <ScrollPanel style={{ height: "calc(85vh - 120px)", maxHeight: "630px" }} className="custombar1">
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className={`text-xl font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                      Welcome to AI Security System
                    </h3>
                    <p className={`${darkMode ? "text-gray-300" : "text-gray-700"} leading-relaxed text-sm`}>
                      Get started with our comprehensive security monitoring platform. Follow these steps to make the most of your experience.
                    </p>
                  </div>

                  <div className="flex flex-column gap-3">
                    {/* Step 1 */}
                    <div className={`p-5 rounded-xl ${darkMode ? "bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700" : "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200"}`}>
                      <div className="flex align-items-start gap-4">
                        <div className="w-10 h-10 rounded-full flex align-items-center justify-content-center font-bold text-lg bg-blue-500 text-white flex-shrink-0">
                          1
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                            Access the Dashboard
                          </h4>
                          <p className={darkMode ? "text-gray-300" : "text-gray-700"}>
                            After logging in, you'll be taken to the main dashboard where you can see an overview of all your security cameras, recent incidents, and alerts.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className={`p-5 rounded-xl ${darkMode ? "bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-700" : "bg-gradient-to-r from-green-50 to-blue-50 border border-green-200"}`}>
                      <div className="flex align-items-start gap-4">
                        <div className="w-10 h-10 rounded-full flex align-items-center justify-content-center font-bold text-lg bg-green-500 text-white flex-shrink-0">
                          2
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                            Monitor Cameras
                          </h4>
                          <p className={darkMode ? "text-gray-300" : "text-gray-700"}>
                            Navigate to the <strong>Cameras</strong> section to view live feeds from all your security cameras. Select any camera to see real-time monitoring and AI-powered detection.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className={`p-5 rounded-xl ${darkMode ? "bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-700" : "bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200"}`}>
                      <div className="flex align-items-start gap-4">
                        <div className="w-10 h-10 rounded-full flex align-items-center justify-content-center font-bold text-lg bg-orange-500 text-white flex-shrink-0">
                          3
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                            Review Alerts
                          </h4>
                          <p className={darkMode ? "text-gray-300" : "text-gray-700"}>
                            Check the <strong>Alerts</strong> page to see all security incidents detected by our AI system. You can acknowledge alerts, view details, and manage incident responses.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className={`p-5 rounded-xl ${darkMode ? "bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-700" : "bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200"}`}>
                      <div className="flex align-items-start gap-4">
                        <div className="w-10 h-10 rounded-full flex align-items-center justify-content-center font-bold text-lg bg-purple-500 text-white flex-shrink-0">
                          4
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                            Generate Reports
                          </h4>
                          <p className={darkMode ? "text-gray-300" : "text-gray-700"}>
                            Visit the <strong>Reports</strong> section to generate comprehensive security reports, view analytics, and export data for compliance and analysis purposes.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
                      <h4 className={`text-lg font-bold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                        Key Features
                      </h4>
                      <ul className={`flex flex-column gap-2 list-none p-0 m-0 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        <li className="flex align-items-center gap-2">
                          <i className="pi pi-check-circle text-green-500"></i>
                          <span>Real-time AI-powered threat detection</span>
                        </li>
                        <li className="flex align-items-center gap-2">
                          <i className="pi pi-check-circle text-green-500"></i>
                          <span>24/7 automated monitoring</span>
                        </li>
                        <li className="flex align-items-center gap-2">
                          <i className="pi pi-check-circle text-green-500"></i>
                          <span>Instant alert notifications</span>
                        </li>
                        <li className="flex align-items-center gap-2">
                          <i className="pi pi-check-circle text-green-500"></i>
                          <span>Comprehensive reporting and analytics</span>
                        </li>
                        <li className="flex align-items-center gap-2">
                          <i className="pi pi-check-circle text-green-500"></i>
                          <span>Multi-camera support</span>
                        </li>
                      </ul>
                    </div>

                    {/* Tips */}
                    <div className={`p-4 rounded-xl ${darkMode ? "bg-yellow-900/20 border border-yellow-700" : "bg-yellow-50 border border-yellow-200"}`}>
                      <h4 className={`text-lg font-bold mb-3 flex align-items-center gap-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                        <i className={`pi pi-lightbulb ${darkMode ? "text-yellow-400" : "text-yellow-600"}`}></i>
                        Pro Tips
                      </h4>
                      <ul className={`flex flex-column gap-2 list-none p-0 m-0 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        <li className="flex align-items-start gap-2">
                          <i className="pi pi-info-circle text-blue-500 mt-1"></i>
                          <span>Set up camera monitoring schedules for optimal coverage</span>
                        </li>
                        <li className="flex align-items-start gap-2">
                          <i className="pi pi-info-circle text-blue-500 mt-1"></i>
                          <span>Configure alert thresholds to reduce false positives</span>
                        </li>
                        <li className="flex align-items-start gap-2">
                          <i className="pi pi-info-circle text-blue-500 mt-1"></i>
                          <span>Regularly review and acknowledge alerts to keep the system updated</span>
                        </li>
                        <li className="flex align-items-start gap-2">
                          <i className="pi pi-info-circle text-blue-500 mt-1"></i>
                          <span>Export reports monthly for compliance documentation</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollPanel>
            </TabPanel>

            {/* Actions Tab */}
            <TabPanel header="Actions" leftIcon="pi pi-cog">
              <ScrollPanel style={{ height: "calc(85vh - 120px)", maxHeight: "630px" }} className="custombar1">
                <div className="p-6">
                  <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                    Quick Actions
                  </h3>

                  <div className="flex flex-column gap-3">
                    <Button
                      label="Go to Dashboard"
                      icon="pi pi-home"
                      className="w-full justify-content-start"
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/dashboard");
                      }}
                    />
                    <Button
                      label="View Cameras"
                      icon="pi pi-video"
                      className="w-full justify-content-start"
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/cameras");
                      }}
                    />
                    <Button
                      label="Check Alerts"
                      icon="pi pi-bell"
                      className="w-full justify-content-start"
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/alerts");
                      }}
                    />
                    <Button
                      label="View Reports"
                      icon="pi pi-file"
                      className="w-full justify-content-start"
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/reports");
                      }}
                    />

                    <Divider className="my-2" />

                    <Button
                      label="Edit Profile Settings"
                      icon="pi pi-user-edit"
                      className="w-full justify-content-start"
                      outlined
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/profile");
                      }}
                    />

                    <Divider className="my-2" />

                    <Button
                      label="Logout"
                      icon="pi pi-sign-out"
                      className="w-full justify-content-start"
                      severity="danger"
                      onClick={handleLogout}
                    />
                  </div>
                </div>
              </ScrollPanel>
            </TabPanel>
          </TabView>
        </div>
      </Dialog>
    </div>
  );
}
