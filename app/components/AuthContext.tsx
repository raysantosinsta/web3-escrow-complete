"use client";
import { createContext, useContext, useState, useRef, ReactNode, useEffect } from "react";
import { io, Socket } from "socket.io-client";

// ─── Usuários fixos do sistema ────────────────────────────────────────────────
export const CLIENT_WALLET    = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
export const FREELANCER_WALLET = "0xdd2fd4581271e230360230f9337d5c0430bf44c0";

type AppUser = {
  id:     string;
  wallet: string;
  name:   string;
  role:   "client" | "freelancer";
  avatar: string;
};

const USERS: AppUser[] = [
  {
    id:     "user-client-1",
    wallet: CLIENT_WALLET,
    name:   "Empresa XPTO",
    role:   "client",
    avatar: "https://i.pravatar.cc/150?u=client-xpto",
  },
  {
    id:     "user-freelancer-1",
    wallet: FREELANCER_WALLET,
    name:   "Roberto Dev",
    role:   "freelancer",
    avatar: "https://i.pravatar.cc/150?u=freelancer-roberto",
  },
];

type AuthContextType = {
  user:       AppUser;
  switchRole: () => void;
  socket:     Socket | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SOCKET_URL = "http://localhost:3001";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userIndex, setUserIndex] = useState(0);
  const [socket, setSocket]       = useState<Socket | null>(null);
  const socketRef                 = useRef<Socket | null>(null);
  const user                      = USERS[userIndex];

  useEffect(() => {
    // Desconecta socket antigo se existir
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const s = io(SOCKET_URL, {
      query:     { wallet: user.wallet },
      transports: ["websocket"],
      forceNew:  true,
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [user.wallet]);

  const switchRole = () => setUserIndex(i => (i + 1) % USERS.length);

  return (
    <AuthContext.Provider value={{ user, switchRole, socket }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
