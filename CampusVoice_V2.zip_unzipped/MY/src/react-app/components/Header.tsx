import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageSquarePlus, Search, Shield, Menu, X, Moon, Sun, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = !!localStorage.getItem("adminToken");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") { document.documentElement.classList.add("dark"); setDarkMode(true); }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark"); localStorage.setItem("theme", "light"); setDarkMode(false);
    } else {
      html.classList.add("dark"); localStorage.setItem("theme", "dark"); setDarkMode(true);
    }
  };

  const navLinks = [
    { path: "/", label: "Report Issue", icon: MessageSquarePlus },
    { path: "/track", label: "Track Status", icon: Search },
    ...(isAdmin ? [
      { path: "/admin", label: "Admin", icon: Shield },
      { path: "/analytics", label: "Analytics", icon: BarChart3 },
    ] : [
      { path: "/admin-login", label: "Admin", icon: Shield },
    ]),
  ];

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-foreground">
              Campus<span className="text-emerald-500">Voice</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link key={link.path} to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                    isActive ? "bg-emerald-500 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}>
                  <Icon className="w-4 h-4" />{link.label}
                </Link>
              );
            })}
            {isAdmin && (
              <button onClick={() => { localStorage.removeItem("adminToken"); navigate("/admin-login"); }}
                className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ml-1 transition-colors">
                Logout
              </button>
            )}
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted ml-1 transition-colors" aria-label="Toggle theme">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </nav>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-muted-foreground">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-border pt-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link key={link.path} to={link.path} onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-emerald-500 text-white" : "hover:bg-muted"
                  }`}>
                  <Icon className="w-4 h-4" />{link.label}
                </Link>
              );
            })}
            <button onClick={toggleTheme} className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted w-full">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />} Toggle Theme
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
