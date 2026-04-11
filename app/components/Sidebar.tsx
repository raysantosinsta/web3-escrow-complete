"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  ShoppingBag, 
  Users, 
  ShieldCheck, 
  UserCircle,
  ChevronRight,
  LogOut,
  RefreshCcw,
  Bell,
  Check
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, switchRole, socket } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch notifications
  useEffect(() => {
    if (!user.wallet) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/notifications/${user.wallet}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();

    if (socket) {
      const handleNewNotification = (notif: Notification) => {
        setNotifications(prev => [notif, ...prev]);
      };
      socket.on('newNotification', handleNewNotification);

      return () => {
        socket.off('newNotification', handleNewNotification);
      };
    }
  }, [user.wallet, socket]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = [
    { name: 'Marketplace', icon: ShoppingBag, path: '/' },
    { name: 'Meus Projetos', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Mensagens', icon: MessageSquare, path: '/inbox' },
  ];

  const navigate = (path: string) => {
    router.push(path);
  };

  return (
    <aside className="w-72 bg-slate-900 border-r border-white/10 flex flex-col h-screen sticky top-0 shrink-0 overflow-hidden shadow-2xl z-40">
      {/* Logo Section */}
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Dev<span className="text-indigo-500">Trust</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Safe Escrow</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-2">
        <div className="px-4 mb-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Geral</p>
        </div>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.1)]' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'}`} />
              <span className="font-semibold text-sm flex-1 text-left">{item.name}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />}
            </button>
          );
        })}
      </nav>

      {/* User Section / Role Switch */}
      <div className="relative p-6 border-t border-white/10 bg-slate-900/50 backdrop-blur-xl">
        
        {/* Notifications Popover */}
        {showNotifications && (
          <div className="absolute bottom-full left-4 right-4 mb-4 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 z-50">
             <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Notificações</span>
                <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
             </div>
             <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs italic">Nenhum aviso no momento</div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-default ${!n.read ? 'bg-indigo-500/5' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-tighter ${!n.read ? 'text-indigo-400' : 'text-slate-500'}`}>{n.title}</span>
                                {!n.read && (
                                    <button onClick={() => markAsRead(n.id)} className="w-5 h-5 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all">
                                        <Check className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-300 font-medium leading-relaxed">{n.message}</p>
                            <span className="text-[9px] text-slate-600 mt-2 block font-bold">{new Date(n.createdAt).toLocaleTimeString()}</span>
                        </div>
                    ))
                )}
             </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-2xl border border-white/5">
          <div className="relative">
            <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/30" alt={user.name} />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-900 shadow-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">{user.role}</p>
          </div>
        </div>

        <button
          onClick={switchRole}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all group"
        >
          <RefreshCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
          Simular Próximo Perfil
        </button>
        
        <div className="mt-4 flex items-center justify-between px-2">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2 rounded-lg transition-all ${showNotifications ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`} 
              title="Notificações"
            >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-slate-900">
                        {unreadCount}
                    </span>
                )}
            </button>
            <button 
                onClick={() => router.push('/')}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors" 
                title="Sair"
            >
                <LogOut className="w-4 h-4" />
            </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
