import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const authenticated = localStorage.getItem("authenticated");
    const user = localStorage.getItem("user");

    if (!token || !authenticated || !user) {
      // Redirect to landing page if not authenticated
      navigate("/");
    }
  }, [navigate]);

  const token = localStorage.getItem("auth_token");
  const authenticated = localStorage.getItem("authenticated");
  const user = localStorage.getItem("user");

  if (!token || !authenticated || !user) {
    return null; // Don't render children if not authenticated
  }

  return <>{children}</>;
}

