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

        // Settings are admin-only, so wrap in try/catch for non-admin users
        try {
          const [settingsList, navList] = await Promise.all([
            base44.entities.AppSettings.list(),
            base44.entities.NavSettings.list(),
          ]);
          if (settingsList.length > 0) setSettings(settingsList[0]);
          if (navList.length > 0) setNavSettings(navList[0]);
        } catch {
          // Non-admin users can't read settings — use defaults
        }

        if (currentUser.role !== 'admin') {
          // First try by user_id
          let djList = await base44.entities.DJ.filter({ user_id: currentUser.id });
          // If not found, try auto-link by email
          if (djList.length === 0 && currentUser.email) {
            const byEmail = await base44.entities.DJ.filter({ email: currentUser.email });
            if (byEmail.length > 0 && !byEmail[0].user_id) {
              await base44.entities.DJ.update(byEmail[0].id, { user_id: currentUser.id });
              djList = [{ ...byEmail[0], user_id: currentUser.id }];
            } else {
              djList = byEmail.filter(d => d.user_id === currentUser.id);
            }
          }
          if (djList.length > 0) setDjProfile(djList[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  const isAdmin = user?.role === 'admin';
  const isDJ = !isAdmin; // All non-admin users see DJ menu

  const primaryColor = settings?.brand_primary_color || '#e94f1c';
  const bgColor = settings?.brand_bg_color || '#F3F4F6';
  const fontFamily = settings?.app_font || 'Assistant';

  const n = navSettings;
  const adminMenuItems = [
    { name: n.nav_dashboard || 'לוח בקרה', page: 'Dashboard', icon: LayoutDashboard },
    { name: n.nav_customers || 'לקוחות', page: 'Customers', icon: Users },
    { name: n.nav_events || 'אירועים', page: 'Events', icon: Sparkles },
    { name: n.nav_calendar || 'יומן', page: 'EventCalendar', icon: Calendar },
    { name: n.nav_djs || 'תקליטנים', page: 'DJs', icon: Music },
    { name: n.nav_tasks || 'משימות', page: 'Tasks', icon: ListChecks },
    { name: 'טופס הזמנה', page: 'BookingForm', icon: Briefcase },
    { name: 'הופעות תקליטנים', page: 'MyShows', icon: Music },
    { name: 'זמינות תקליטנים', page: 'DJAvailability', icon: Calendar },
  ];

  const djMenuItems = [
    { name: 'לוח ההופעות שלי', page: 'MyShows', icon: Calendar },
    { name: 'הזמינות שלי', page: 'MyAvailability', icon: ListChecks },
  ];

  const menuItems = isAdmin ? adminMenuItems : djMenuItems;
  
  // For non-admin users, default page is MyShows not Dashboard
  const defaultDJPage = 'MyShows';

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
        {navSettings.logo_url && (
          <header className="p-6 flex flex-col items-center border-b border-gray-50">
            <div className="w-32">
              <img
                src={navSettings.logo_url}
                alt="Logo"
                className="w-full h-auto object-contain"
              />
            </div>
          </header>
        )}

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
                  <span>{navSettings.nav_settings || 'הגדרות'}</span>
                </Link>
              </li>
            )}
            <li>
              <button
                onClick={() => base44.auth.logout()}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors duration-200"
              >
                <LogOut size={20} />
                <span>{navSettings.nav_logout || 'התנתקות'}</span>
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