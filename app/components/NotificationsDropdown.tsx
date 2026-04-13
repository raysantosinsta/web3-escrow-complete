"use client";

import { Bell, MessageSquare, ExternalLink, CheckCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NotificationsDropdown() {
  const { notifications, unreadCount, markNotificationAsRead } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: any) => {
    // Marcar como lido
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }

    // Redirecionar
    if (notification.data?.jobId) {
      router.push(`/job/${notification.data.jobId}`);
    } else if (notification.data?.conversationId) {
      router.push(`/chat/${notification.data.conversationId}`);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-[#F4F6F8] border border-slate-200 text-[#666666] hover:text-[#00AEEF] hover:bg-white transition-all shadow-sm active:scale-95"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF4B2B] text-[10px] font-black text-white shadow-lg ring-2 ring-white animate-bounce-subtle">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl shadow-[#2D2D2D]/10 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white to-slate-50">
            <div>
              <h3 className="font-black text-[#2D2D2D] text-sm uppercase tracking-wider">Notificações</h3>
              <p className="text-[10px] text-[#666666] font-bold uppercase tracking-widest mt-0.5">Alertas em tempo real</p>
            </div>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-[#00AEEF]/10 text-[#00AEEF] text-[10px] font-black rounded-md border border-[#00AEEF]/20">
                {unreadCount} NOVAS
              </span>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Bell className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-[#666666] uppercase tracking-widest">Nada por aqui</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Fique tranquilo, o silêncio é ouro.</p>
              </div>
            ) : (
              <div className="py-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`px-5 py-4 cursor-pointer transition-all hover:bg-[#F4F6F8] border-l-4 ${
                      !notif.read ? "border-[#00AEEF] bg-[#00AEEF]/5" : "border-transparent"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`mt-1 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        !notif.read ? "bg-[#00AEEF] text-white" : "bg-slate-100 text-slate-400"
                      }`}>
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <p className={`text-xs font-black uppercase tracking-tight truncate ${
                            !notif.read ? "text-[#2D2D2D]" : "text-[#666666]"
                          }`}>
                            {notif.title}
                          </p>
                          <span className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap ml-2">
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-xs text-[#666666] line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                           <button className="text-[10px] font-black text-[#00AEEF] uppercase tracking-widest flex items-center gap-1 hover:underline">
                             Abrir Conversa <ExternalLink className="w-2.5 h-2.5" />
                           </button>
                           {!notif.read && (
                             <div className="w-1.5 h-1.5 rounded-full bg-[#00AEEF] animate-pulse" />
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button className="text-[10px] font-black text-[#666666] uppercase tracking-[0.2em] hover:text-[#2D2D2D] transition-colors">
                Ver Todas
              </button>
            </div>
          )}
        </div>
      )}
      
      <style jsx global>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite;
        }
      `}</style>
    </div>
  );
}
