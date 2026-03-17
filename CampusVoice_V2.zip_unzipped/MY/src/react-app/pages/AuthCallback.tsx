import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Normally authentication logic goes here
    navigate("/admin");
  }, []);

  return <p className="p-6">Logging in...</p>;
}