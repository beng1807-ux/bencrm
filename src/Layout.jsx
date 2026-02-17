import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Menu, X, Home, Users, Calendar, ListChecks, Settings, Briefcase, Music } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [djProfile, setDjProfile] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          // User not authenticated - this is OK for public pages
          return;
        }

        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const settingsList = await base44.entities.AppSettings.list();
        if (settingsList.length > 0) {
          setSettings(settingsList[0]);
        }

        // בדיקה אם המשתמש הוא DJ
        if (currentUser.role !== 'admin') {
          const djList = await base44.entities.DJ.filter({ user_id: currentUser.id });
          if (djList.length > 0) {
            setDjProfile(djList[0]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  const isAdmin = user?.role === 'admin';
  const isDJ = !isAdmin && djProfile;

  const primaryColor = settings?.brand_primary_color || '#FF6B4A';
  const bgColor = settings?.brand_bg_color || '#F3F4F6';
  const headingColor = settings?.brand_heading_color || '#1E293B';
  const fontFamily = settings?.app_font || 'Rubik';

  const adminMenuItems = [
    { name: 'דשבורד', page: 'Dashboard', icon: Home },
    { name: 'לידים', page: 'Leads', icon: Users },
    { name: 'לקוחות', page: 'Customers', icon: Briefcase },
    { name: 'אירועים', page: 'Events', icon: Calendar },
    { name: 'יומן אירועים', page: 'EventCalendar', icon: Calendar },
    { name: 'DJ-ים', page: 'DJs', icon: Music },
    { name: 'משימות', page: 'Tasks', icon: ListChecks },
    { name: 'ניהול', page: 'Management', icon: Settings },
  ];

  const djMenuItems = [
    { name: 'לוח ההופעות שלי', page: 'MyShows', icon: Calendar },
    { name: 'הזמינות שלי', page: 'MyAvailability', icon: ListChecks },
  ];

  const menuItems = isAdmin ? adminMenuItems : djMenuItems;

  // No layout for non-authenticated users (public pages handle their own layout)
  if (!user) {
    return children;
  }

  return (
    <div dir="rtl" style={{ fontFamily, backgroundColor: bgColor }} className="min-h-screen">
      <style>{`
        :root {
          --primary: ${primaryColor};
          --bg: ${bgColor};
          --heading: ${headingColor};
        }
      `}</style>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                     style={{ backgroundColor: primaryColor }}>
                  {settings?.app_name?.charAt(0) || 'ס'}
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: headingColor }}>
                    {settings?.app_name || 'סקיצה'}
                  </h1>
                  <p className="text-xs text-gray-500">{settings?.owner_name || 'בן גבאי'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={() => base44.auth.logout()}
                className="text-sm px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                יציאה
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${menuOpen ? 'block' : 'hidden'} md:block fixed md:sticky top-16 right-0 h-[calc(100vh-4rem)] w-64 bg-white border-l border-gray-200 overflow-y-auto z-40`}>
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={isActive ? { backgroundColor: primaryColor } : {}}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}