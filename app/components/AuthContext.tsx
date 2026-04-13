"use client";
import { createContext, useContext, useState, useRef, ReactNode, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useAccount } from "wagmi";
import OnboardingModal from "./OnboardingModal";


type AppUser = {
  id: string;
  wallet: string;
  name: string;
  role: "client" | "freelancer";
  avatar: string;
};

// Removed hardcoded USERS array

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data: any;
};

type AuthContextType = {
  user: AppUser;
  switchRole: () => void;
  socket: Socket | null;
  notifications: Notification[];
  unreadCount: number;
  markNotificationAsRead: (id: string) => void;
  clearChatNotifications: (type: 'conversation' | 'job', id: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SOCKET_URL = "http://localhost:3001";


export function AuthProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isUnregistered, setIsUnregistered] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const fetchUser = async (wallet: string) => {
    setLoadingContext(true);
    try {
      const res = await fetch(`http://localhost:3001/api/users/${wallet}`);
      if (res.status === 404) {
        setIsUnregistered(true);
        setUser(null);
      } else if (res.ok) {
        const data = await res.json();
        setUser({
          id: data.id,
          wallet: data.wallet,
          name: data.name,
          role: data.role,
          avatar: data.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${data.wallet}`,
        });
        setIsUnregistered(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContext(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchUser(address);
      fetchNotifications(address);
    } else {
      setUser(null);
      setNotifications([]);
      setUnreadCount(0);
      setIsUnregistered(false);
    }
  }, [address]);

  const fetchNotifications = async (wallet: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/notifications/${wallet}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    } catch (e) {
      console.error("Erro ao buscar notificações:", e);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const clearChatNotifications = async (type: 'conversation' | 'job', id: string) => {
    if (!user) return;
    try {
      await fetch(`http://localhost:3001/api/notifications/user/${user.wallet}/${type}/${id}/read`, { method: 'PATCH' });
      const key = type === 'conversation' ? 'conversationId' : 'jobId';

      setNotifications(prev => {
        const affected = prev.filter(n => !n.read && n.data?.[key] === id);
        if (affected.length === 0) return prev;

        setUnreadCount(count => Math.max(0, count - affected.length));
        return prev.map(n => n.data?.[key] === id ? { ...n, read: true } : n);
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Socket
  useEffect(() => {
    if (!user) return; // Only connect socket if completely logged in
    // Desconecta socket antigo se existir
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const s = io(SOCKET_URL, {
      query: { wallet: user.wallet },
      transports: ["websocket"],
      forceNew: true,
    });

    socketRef.current = s;
    setSocket(s);

    s.on("newNotification", (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [user?.wallet]);

  // switchRole is kept for mocked compatibility if needed, but the actual role is now DB driven.
  const switchRole = () => { };

  return (
    <AuthContext.Provider value={{
      user: user || ({} as AppUser),
      switchRole,
      socket,
      notifications,
      unreadCount,
      markNotificationAsRead,
      clearChatNotifications
    }}>
      {isUnregistered && address && <OnboardingModal onComplete={() => fetchUser(address)} />}
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
