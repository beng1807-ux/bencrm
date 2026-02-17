import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import {
  LayoutDashboard, Users, Sparkles, Calendar, Music,
  ListChecks, Settings, LogOut, User, Briefcase, BarChart3
} from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [navSettings, setNavSettings] = useState({});
  const [djProfile, setDjProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return;

        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const settingsList = await base44.entities.AppSettings.list();
        if (settingsList.length > 0) setSettings(settingsList[0]);

        if (currentUser.role !== 'admin') {
          const djList = await base44.entities.DJ.filter({ user_id: currentUser.id });
          if (djList.length > 0) setDjProfile(djList[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  const isAdmin = user?.role === 'admin';
  const isDJ = !isAdmin && djProfile;

  const primaryColor = settings?.brand_primary_color || '#e94f1c';
  const bgColor = settings?.brand_bg_color || '#F3F4F6';
  const fontFamily = settings?.app_font || 'Assistant';

  const adminMenuItems = [
    { name: 'לוח בקרה', page: 'Dashboard', icon: LayoutDashboard },
    { name: 'לידים', page: 'Leads', icon: Users },
    { name: 'לקוחות', page: 'Customers', icon: Briefcase },
    { name: 'אירועים', page: 'Events', icon: Sparkles },
    { name: 'יומן', page: 'EventCalendar', icon: Calendar },
    { name: 'תקליטנים', page: 'DJs', icon: Music },
    { name: 'משימות', page: 'Tasks', icon: ListChecks },
  ];

  const djMenuItems = [
    { name: 'לוח ההופעות שלי', page: 'MyShows', icon: Calendar },
    { name: 'הזמינות שלי', page: 'MyAvailability', icon: ListChecks },
  ];

  const menuItems = isAdmin ? adminMenuItems : djMenuItems;

  if (!user) return children;

  const displayName = user.full_name || user.email;

  return (
    <div dir="rtl" style={{ fontFamily: `${fontFamily}, sans-serif`, backgroundColor: bgColor }} className="min-h-screen flex">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;600;700&display=swap');
        :root {
          --primary: ${primaryColor};
          --bg: ${bgColor};
        }
        .sidebar-scrollbar::-webkit-scrollbar { width: 4px; }
        .sidebar-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
      `}</style>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 right-0 h-screen w-64 bg-white border-l border-gray-200
          flex flex-col z-40 transition-transform duration-300
          ${menuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <header className="p-6 flex flex-col items-center border-b border-gray-50">
          <div className="w-32">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0_uKfsvVKZ4Mpi9MLyf9vBach0cn4cN--SNFGgFjz6tGPezBfgF7zw9Ahm8SSnGw1IZ8XunIiJAugS5SuKBYHnJgZfLwYdUPhz8VIa-2HTwq6T1UUoZXCstl9rGz6LC-F_3YcdRbxd7jhlvCi0sB9tqDRro18Naj5ErM82bTc1WUNSBXLD2oznh9-nzVjx04FzGceugXXCxD7TAiWuR2ZjCHrzPlxUnaitRTYa0O3QWErwEktq68zHcI8uc5mDrhWGlMmlIqYu7nL"
              alt="Skitza Logo"
              className="w-full h-auto object-contain"
            />
          </div>
        </header>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto sidebar-scrollbar">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <li key={item.page} className="relative">
                  <Link
                    to={createPageUrl(item.page)}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors duration-200 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    style={isActive ? { backgroundColor: primaryColor } : {}}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <footer className="p-4 border-t border-gray-100">
          <ul className="space-y-1">
            {isAdmin && (
              <li>
                <Link
                  to={createPageUrl('Management')}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                    currentPageName === 'Management'
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  style={currentPageName === 'Management' ? { backgroundColor: primaryColor } : {}}
                >
                  <Settings size={20} />
                  <span>הגדרות</span>
                </Link>
              </li>
            )}
            <li>
              <button
                onClick={() => base44.auth.logout()}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors duration-200"
              >
                <LogOut size={20} />
                <span>התנתקות</span>
              </button>
            </li>
          </ul>

          {/* User info */}
          <div className="mt-3 flex items-center gap-3 px-4 py-3 border-t border-gray-50 pt-4">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              <User size={18} className="text-gray-400" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-gray-800 truncate">{displayName}</span>
              <span className="text-xs text-gray-400 truncate">{user.email}</span>
            </div>
          </div>
        </footer>
      </aside>

      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 bg-white rounded-lg shadow-md border border-gray-200"
        >
          <div className="w-5 h-0.5 bg-gray-600 mb-1"></div>
          <div className="w-5 h-0.5 bg-gray-600 mb-1"></div>
          <div className="w-5 h-0.5 bg-gray-600"></div>
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}