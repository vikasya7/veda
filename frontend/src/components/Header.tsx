"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutGrid, Bell, ChevronDown } from "lucide-react";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export default function Header({ title = "Assignment", showBack = false }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="topbar">
      <div className="topbar-left">
        {showBack && (
          <button className="back-btn" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </button>
        )}
        <LayoutGrid size={18} className="topbar-icon" />
        <span className="topbar-title">{title}</span>
      </div>
      <div className="topbar-right">
        <button className="notif-btn">
          <Bell size={18} />
          <span className="notif-dot" />
        </button>
        <button className="user-btn">
          <div className="user-avatar">
            <img src="/avatar.png" alt="User" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div className="user-avatar-fallback">J</div>
          </div>
          <span>John Doe</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}