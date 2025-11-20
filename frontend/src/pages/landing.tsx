import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Dialog } from "primereact/dialog";
import { Avatar } from "primereact/avatar";
import { TabView, TabPanel } from "primereact/tabview";
import { Divider } from "primereact/divider";
import { ScrollPanel } from "primereact/scrollpanel";
import { Menubar } from "primereact/menubar";
import { InputSwitch } from "primereact/inputswitch";
import axios from "axios";

export default function Landing() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

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
    
    // Only update if the href is different to avoid unnecessary reloads
    if (link.href !== newHref) {
      link.href = newHref;
    }
    
    // Apply dark mode classes
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  };

  useEffect(() => {
    // Ensure theme link exists first
    ensureThemeLink();
    
    const stored = localStorage.getItem("ai_theme_mode");
    const prefersDark =
      stored === "dark" ||
      (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(prefersDark);
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      applyTheme(prefersDark);
    }, 10);
    setIsVisible(true);

    // Load user data if logged in
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    }

    // Intersection Observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-fade-in");
          entry.target.classList.remove("opacity-0");
        }
      });
    }, observerOptions);
    
    // Separate observer for feature cards with stagger effect
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.classList.contains("feature-card")) {
          const card = entry.target as HTMLElement;
          const index = Array.from(document.querySelectorAll(".feature-card")).indexOf(card);
          setTimeout(() => {
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
          }, index * 100);
          cardObserver.unobserve(card);
        }
      });
    }, observerOptions);

    // Delay observer setup to ensure refs are attached
    setTimeout(() => {
      const refs = [heroRef, featuresRef, statsRef];
      refs.forEach((ref) => {
        if (ref.current) {
          observer.observe(ref.current);
        }
      });
      
      // Also observe feature cards individually for stagger effect
      const featureCards = document.querySelectorAll(".feature-card");
      featureCards.forEach((card) => {
        cardObserver.observe(card);
      });
    }, 100);

    return () => {
      const refs = [heroRef, featuresRef, statsRef];
      refs.forEach((ref) => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
      const featureCards = document.querySelectorAll(".feature-card");
      featureCards.forEach((card) => {
        cardObserver.unobserve(card);
      });
    };
  }, []);

  const toggleDarkMode = (v: boolean) => {
    setDarkMode(v);
    localStorage.setItem("ai_theme_mode", v ? "dark" : "light");
    applyTheme(v);
  };

  // Header components
  const headerStart = (
    <div className="flex align-items-center gap-3">
      <i className="pi pi-shield text-primary text-2xl"></i>
      <h1 className="text-xl font-bold m-0">
        AI Security System
      </h1>
    </div>
  );

  const headerEnd = (
    <div className="flex align-items-center gap-3">
      {user ? (
        <Button
          className="p-button-text p-button-rounded"
          onClick={() => setShowProfileOverlay(true)}
          aria-label="User Profile"
        >
          <Avatar
            label={user?.username?.[0]?.toUpperCase() || "U"}
            shape="circle"
            className="bg-gradient-to-br from-blue-500 to-purple-500 text-white cursor-pointer hover:opacity-80 transition-opacity"
          />
        </Button>
      ) : (
        <Button
          label="Login"
          icon="pi pi-sign-in"
          className="hover:scale-105 transition-transform duration-300"
          onClick={() => setShowLogin(true)}
        />
      )}
      <div className={`flex align-items-center gap-2 ${darkMode ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1`}>
        <i className="pi pi-sun text-yellow-500"></i>
        <InputSwitch checked={darkMode} onChange={(e) => toggleDarkMode(!!e.value)} />
        <i className="pi pi-moon text-blue-500"></i>
      </div>
    </div>
  );

  const handleLogin = async () => {
    if (!username || !password) {
      setLoginError("Please enter both username and password");
      return;
    }

    setLoading(true);
    setLoginError("");

    try {
      const API_URL = "http://127.0.0.1:8000/api";
      
      // Call the login endpoint with username and password
      const response = await axios.post(`${API_URL}/auth/login/`, {
        username: username,
        password: password,
      });

      const { token, user: userData } = response.data;

      if (!token || !userData) {
        setLoginError("Invalid response from server");
        setLoading(false);
        return;
      }

      // Store authentication token
      localStorage.setItem("auth_token", token);
      
      // Store user info
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("authenticated", "true");
      setUser(userData);
      
      // Close login dialog and navigate to dashboard
      setShowLogin(false);
      setUsername("");
      setPassword("");
      navigate("/dashboard");
    } catch (error: any) {
      if (error.response?.status === 400) {
        setLoginError(error.response?.data?.error || "Please enter both username and password");
      } else if (error.response?.status === 401) {
        setLoginError(error.response?.data?.error || "Invalid username or password");
      } else if (error.response?.status === 403) {
        setLoginError(error.response?.data?.error || "User account is disabled");
      } else if (error.response?.status === 404) {
        setLoginError("Authentication service not available");
      } else {
        setLoginError(
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.response?.data?.non_field_errors?.[0] ||
          "Authentication failed. Please check your credentials."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const features = useMemo(() => [
    {
      icon: "pi pi-video",
      title: "Live Camera Monitoring",
      description: "Real-time video feeds from multiple security cameras with high-definition streaming",
      color: "blue",
      gradient: darkMode ? "from-blue-600 to-blue-800" : "from-blue-400 to-blue-600",
    },
    {
      icon: "pi pi-shield",
      title: "AI Detection",
      description: "YOLO-powered object and threat detection with 99% accuracy",
      color: "green",
      gradient: darkMode ? "from-green-600 to-green-800" : "from-green-400 to-green-600",
    },
    {
      icon: "pi pi-bell",
      title: "Smart Alerts",
      description: "Instant alerts and incident management with priority classification",
      color: "red",
      gradient: darkMode ? "from-red-600 to-red-800" : "from-red-400 to-red-600",
    },
    {
      icon: "pi pi-chart-line",
      title: "Analytics Dashboard",
      description: "Comprehensive insights and reporting with real-time statistics",
      color: "purple",
      gradient: darkMode ? "from-purple-600 to-purple-800" : "from-purple-400 to-purple-600",
    },
    {
      icon: "pi pi-lock",
      title: "Secure Access",
      description: "Enterprise-grade security with encrypted data transmission",
      color: "orange",
      gradient: darkMode ? "from-orange-600 to-orange-800" : "from-orange-400 to-orange-600",
    },
    {
      icon: "pi pi-mobile",
      title: "Mobile Ready",
      description: "Access your security system from anywhere, anytime",
      color: "cyan",
      gradient: darkMode ? "from-cyan-600 to-cyan-800" : "from-cyan-400 to-cyan-600",
    },
  ], [darkMode]);

  const stats = [
    { value: "99.9%", label: "Uptime", icon: "pi pi-check-circle" },
    { value: "24/7", label: "Monitoring", icon: "pi pi-clock" },
    { value: "<1s", label: "Response Time", icon: "pi pi-bolt" },
    { value: "1000+", label: "Active Cameras", icon: "pi pi-camera" },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-950" : "bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50"} transition-colors duration-500 relative overflow-hidden`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 left-10 w-72 h-72 ${darkMode ? "bg-blue-900/20" : "bg-blue-400/20"} rounded-full blur-3xl animate-pulse`}></div>
        <div className={`absolute bottom-20 right-10 w-96 h-96 ${darkMode ? "bg-purple-900/20" : "bg-purple-400/20"} rounded-full blur-3xl animate-pulse delay-1000`}></div>
        <div className={`absolute top-1/2 left-1/2 w-64 h-64 ${darkMode ? "bg-green-900/10" : "bg-green-400/10"} rounded-full blur-3xl animate-pulse delay-2000`}></div>
      </div>

      {/* Header */}
      <Menubar start={headerStart} end={headerEnd} className="shadow-sm" />

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section ref={heroRef} className={`min-h-[90vh] flex items-center justify-center p-6 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="max-w-6xl w-full">
            <div className="text-center mb-12">
              <div className="mb-4 relative inline-block">
                <div className={`absolute inset-0 ${darkMode ? "bg-blue-500/20" : "bg-blue-500/15"} rounded-full blur-xl animate-pulse`} style={{ width: '120%', height: '120%', left: '-10%', top: '-10%' }}></div>
                <div className={`relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-2xl ${darkMode ? "bg-gradient-to-br from-blue-600 to-purple-600" : "bg-gradient-to-br from-blue-500 to-purple-500"} flex items-center justify-center shadow-2xl ${isVisible ? "animate-bounce-slow" : ""}`}>
                  <i className="pi pi-shield text-4xl md:text-5xl text-white"></i>
                </div>
              </div>
              <h1 className={`text-5xl md:text-7xl font-extrabold mb-4 bg-gradient-to-r ${darkMode ? "from-blue-400 via-purple-400 to-blue-400" : "from-blue-600 via-purple-600 to-blue-600"} bg-clip-text text-transparent animate-gradient`}>
                AI Security System
              </h1>
              <p className={`text-2xl md:text-3xl font-medium mb-6 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Advanced AI-Powered Security Monitoring
              </p>
              <p className={`text-lg md:text-xl mb-8 ${darkMode ? "text-gray-400" : "text-gray-600"} max-w-2xl mx-auto`}>
                Protect your premises with cutting-edge artificial intelligence, real-time threat detection, and intelligent alert systems
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Button
                  label="Access Dashboard"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  size="large"
                  className="p-button-lg px-8 py-4 text-lg shadow-xl hover:scale-105 transition-transform duration-300"
                  onClick={() => navigate("/dashboard")}
                />
                <Button
                  label="Learn More"
                  icon="pi pi-info-circle"
                  iconPos="right"
                  size="large"
                  outlined
                  className="p-button-lg px-8 py-4 text-lg hover:scale-105 transition-transform duration-300"
                  onClick={() => {
                    setTimeout(() => {
                      const featuresElement = document.getElementById("features");
                      if (featuresElement) {
                        const headerOffset = 100;
                        const elementPosition = featuresElement.offsetTop;
                        window.scrollTo({
                          top: elementPosition - headerOffset,
                          behavior: "smooth"
                        });
                      }
                    }, 100);
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 px-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl ${darkMode ? "bg-gray-800/50 backdrop-blur-sm border border-gray-700" : "bg-white/70 backdrop-blur-sm border border-gray-200"} shadow-md hover:scale-105 transition-all duration-300 hover:shadow-lg relative overflow-hidden group`}
                  style={{
                    animationDelay: `${index * 150}ms`,
                  }}
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <i className={`${stat.icon} text-2xl text-primary mb-2 block group-hover:scale-110 transition-transform duration-300`}></i>
                  <div className={`text-2xl md:text-3xl font-bold mb-1 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                    {stat.value}
                  </div>
                  <div className={`text-xs md:text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" ref={featuresRef} className="py-24 px-6 relative z-10">
          <div className="max-w-6xl mx-auto w-full">
            <div className="text-center mb-16">
              <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                Powerful Features
              </h2>
              <p className={`text-xl ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Everything you need for comprehensive security monitoring
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 features-container">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`feature-card group p-5 rounded-xl ${darkMode ? "bg-gray-800/50 backdrop-blur-sm border border-gray-700" : "bg-white/70 backdrop-blur-sm border border-gray-200"} shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden`}
                  onClick={() => navigate("/dashboard")}
                  style={{
                    opacity: 0,
                    transform: "translateY(20px)",
                    transition: "opacity 0.6s ease, transform 0.6s ease",
                    zIndex: 1,
                  }}
                >
                  {/* Animated background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md`}>
                      <i className={`${feature.icon} text-xl text-white`}></i>
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"} group-hover:text-primary transition-colors duration-300`}>
                      {feature.title}
                    </h3>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"} leading-relaxed line-clamp-3`}>
                      {feature.description}
                    </p>
                    <div className="mt-3 flex items-center text-primary font-semibold text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-1">
                      <span>Learn more</span>
                      <i className="pi pi-arrow-right ml-2"></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <Card className={`${darkMode ? "bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-700" : "bg-gradient-to-r from-blue-500 to-purple-600 border-0"} shadow-2xl`}>
              <div className="p-12 text-center">
                <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${darkMode ? "text-gray-100" : "text-white"}`}>
                  Ready to Get Started?
                </h2>
                <p className={`text-xl mb-8 ${darkMode ? "text-gray-300" : "text-blue-50"}`}>
                  Experience the future of security monitoring with our AI-powered platform
                </p>
                <Button
                  label="Launch Dashboard"
                  icon="pi pi-rocket"
                  iconPos="right"
                  size="large"
                  className="p-button-lg px-10 py-4 text-lg bg-white text-blue-600 hover:scale-105 transition-transform duration-300 shadow-xl"
                  onClick={() => navigate("/dashboard")}
                />
              </div>
            </Card>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className={`${darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} border-t py-8 px-6`}>
        <div className="max-w-6xl mx-auto text-center">
          <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            © 2024 AI Security System. Powered by advanced AI technology.
          </p>
        </div>
      </footer>

      {/* Profile Overlay */}
      <Dialog
        visible={showProfileOverlay}
        onHide={() => setShowProfileOverlay(false)}
        className={`${darkMode ? "p-dialog-dark" : ""}`}
        style={{ width: "90vw", maxWidth: "800px" }}
        contentStyle={{ height: "85vh", maxHeight: "700px", padding: "0" }}
        draggable={false}
        resizable={false}
        modal
        closable
        dismissableMask
        header={
          <div className={`flex items-center justify-between w-full ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
            <h2 className="text-2xl font-bold m-0">User Menu</h2>
            <Button
              icon="pi pi-times"
              className="p-button-text p-button-rounded"
              onClick={() => setShowProfileOverlay(false)}
            />
          </div>
        }
      >
        <div className={`h-full ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
          <TabView className="h-full">
            {/* Profile Tab */}
            <TabPanel header="Profile" leftIcon="pi pi-user">
              <ScrollPanel style={{ height: "550px" }} className="custombar1">
                <div className="p-6">
                  <div className="text-center mb-6">
                    <Avatar
                      label={user?.username?.[0]?.toUpperCase() || "U"}
                      size="xlarge"
                      shape="circle"
                      className={`${darkMode ? "bg-gradient-to-br from-blue-600 to-purple-600" : "bg-gradient-to-br from-blue-500 to-purple-500"} text-white text-4xl mb-4`}
                    />
                    <h3 className={`text-2xl font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                      {user?.first_name && user?.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user?.username || "User"}
                    </h3>
                    <p className={`text-sm mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {user?.email || "No email"}
                    </p>
                    {user?.role && (
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                        darkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-700"
                      }`}>
                        {user.role}
                      </span>
                    )}
                  </div>

                  <Divider />

                  <div className="mt-6 space-y-4">
                    <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>Username</span>
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>{user?.username || "N/A"}</span>
                      </div>
                    </div>
                    <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>Email</span>
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>{user?.email || "N/A"}</span>
                      </div>
                    </div>
                    {user?.first_name && (
                      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>Full Name</span>
                          <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
                            {user.first_name} {user.last_name || ""}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <Button
                      label="Edit Profile"
                      icon="pi pi-pencil"
                      className="w-full"
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/profile");
                      }}
                    />
                  </div>
                </div>
              </ScrollPanel>
            </TabPanel>

            {/* How to Use Platform Tab */}
            <TabPanel header="How to Use" leftIcon="pi pi-question-circle">
              <ScrollPanel style={{ height: "550px" }} className="custombar1">
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                      Welcome to AI Security System
                    </h3>
                    <p className={`${darkMode ? "text-gray-300" : "text-gray-700"} leading-relaxed`}>
                      Get started with our comprehensive security monitoring platform. Follow these steps to make the most of your experience.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Step 1 */}
                    <div className={`p-5 rounded-xl ${darkMode ? "bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700" : "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200"}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white"
                        }`}>
                          1
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                            Access the Dashboard
                          </h4>
                          <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            After logging in, you'll be taken to the main dashboard where you can see an overview of all your security cameras, recent incidents, and alerts.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className={`p-5 rounded-xl ${darkMode ? "bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-700" : "bg-gradient-to-r from-green-50 to-blue-50 border border-green-200"}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          darkMode ? "bg-green-600 text-white" : "bg-green-500 text-white"
                        }`}>
                          2
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                            Monitor Cameras
                          </h4>
                          <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Navigate to the <strong>Cameras</strong> section to view live feeds from all your security cameras. Select any camera to see real-time monitoring and AI-powered detection.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className={`p-5 rounded-xl ${darkMode ? "bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-700" : "bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200"}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          darkMode ? "bg-orange-600 text-white" : "bg-orange-500 text-white"
                        }`}>
                          3
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                            Review Alerts
                          </h4>
                          <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Check the <strong>Alerts</strong> page to see all security incidents detected by our AI system. You can acknowledge alerts, view details, and manage incident responses.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className={`p-5 rounded-xl ${darkMode ? "bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-700" : "bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200"}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          darkMode ? "bg-purple-600 text-white" : "bg-purple-500 text-white"
                        }`}>
                          4
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                            Generate Reports
                          </h4>
                          <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Visit the <strong>Reports</strong> section to generate comprehensive security reports, view analytics, and export data for compliance and analysis purposes.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className={`mt-6 p-5 rounded-xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
                      <h4 className={`text-lg font-bold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                        Key Features
                      </h4>
                      <ul className={`space-y-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        <li className="flex items-center gap-2">
                          <i className="pi pi-check-circle text-green-500"></i>
                          <span>Real-time AI-powered threat detection</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <i className="pi pi-check-circle text-green-500"></i>
                          <span>24/7 automated monitoring</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <i className="pi pi-check-circle text-green-500"></i>
                          <span>Instant alert notifications</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <i className="pi pi-check-circle text-green-500"></i>
                          <span>Comprehensive reporting and analytics</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <i className="pi pi-check-circle text-green-500"></i>
                          <span>Multi-camera support</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollPanel>
            </TabPanel>

            {/* Actions Tab */}
            <TabPanel header="Actions" leftIcon="pi pi-cog">
              <ScrollPanel style={{ height: "550px" }} className="custombar1">
                <div className="p-6">
                  <h3 className={`text-xl font-bold mb-6 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                    Quick Actions
                  </h3>

                  <div className="space-y-4">
                    <Button
                      label="Go to Dashboard"
                      icon="pi pi-home"
                      className="w-full justify-start p-button-lg"
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/dashboard");
                      }}
                    />
                    <Button
                      label="View Cameras"
                      icon="pi pi-video"
                      className="w-full justify-start p-button-lg"
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/cameras");
                      }}
                    />
                    <Button
                      label="Check Alerts"
                      icon="pi pi-bell"
                      className="w-full justify-start p-button-lg"
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/alerts");
                      }}
                    />
                    <Button
                      label="View Reports"
                      icon="pi pi-file"
                      className="w-full justify-start p-button-lg"
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/reports");
                      }}
                    />

                    <Divider />

                    <Button
                      label="Edit Profile Settings"
                      icon="pi pi-user-edit"
                      className="w-full justify-start p-button-lg"
                      outlined
                      onClick={() => {
                        setShowProfileOverlay(false);
                        navigate("/profile");
                      }}
                    />

                    <Divider />

                    <Button
                      label="Logout"
                      icon="pi pi-sign-out"
                      className="w-full justify-start p-button-lg"
                      severity="danger"
                      onClick={() => {
                        localStorage.removeItem("auth_token");
                        localStorage.removeItem("user");
                        localStorage.removeItem("authenticated");
                        setUser(null);
                        setShowProfileOverlay(false);
                        navigate("/");
                      }}
                    />
                  </div>
                </div>
              </ScrollPanel>
            </TabPanel>
          </TabView>
        </div>
      </Dialog>

      {/* Login Dialog */}
      <Dialog
        header="Login to AI Security System"
        visible={showLogin}
        onHide={() => {
          setShowLogin(false);
          setLoginError("");
          setUsername("");
          setPassword("");
        }}
        className={darkMode ? "p-dialog-dark" : ""}
        style={{ width: "90vw", maxWidth: "450px" }}
        draggable={false}
        resizable={false}
      >
        <div className="flex flex-col gap-4 p-4">
          <div>
            <label
              htmlFor="username"
              className={`block mb-2 font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}
            >
              Username
            </label>
            <InputText
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className={`block mb-2 font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}
            >
              Password
            </label>
            <Password
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full"
              feedback={false}
              toggleMask
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
            />
          </div>

          {loginError && (
            <div className={`p-3 rounded-lg ${darkMode ? "bg-red-900/30 border border-red-700" : "bg-red-50 border border-red-200"}`}>
              <p className={`text-sm ${darkMode ? "text-red-300" : "text-red-600"}`}>
                <i className="pi pi-exclamation-triangle mr-2"></i>
                {loginError}
              </p>
            </div>
          )}

          <Button
            label={loading ? "Logging in..." : "Login"}
            icon={loading ? "pi pi-spin pi-spinner" : "pi pi-sign-in"}
            onClick={handleLogin}
            loading={loading}
            className="w-full mt-2"
            disabled={loading}
          />

          <p className={`text-sm text-center ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Don't have an account?{" "}
            <button
              onClick={() => {
                setShowLogin(false);
                // You can add a register function here
              }}
              className={`font-semibold hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}
            >
              Contact Administrator
            </button>
          </p>
        </div>
      </Dialog>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
        .animate-fade-in {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .delay-1000 {
          animation-delay: 1s;
        }
        .delay-2000 {
          animation-delay: 2s;
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .feature-card {
          animation: slideInUp 0.6s ease-out forwards;
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .stat-card:hover::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: shimmer 0.6s;
        }
      `}</style>
    </div>
  );
}

