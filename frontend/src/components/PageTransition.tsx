import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      className={`page-transition ${isAnimating ? "page-transition-fadeIn" : ""}`}
      style={{ width: "100%", minHeight: "100vh" }}
    >
      {children}
    </div>
  );
}

