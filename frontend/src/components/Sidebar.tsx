"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Users, FileText, Wand2, Library, Settings, Sparkles,
} from "lucide-react";

const navItems = [
  { label: "Home",                 icon: LayoutGrid, href: "/",            disabled: true  },
  { label: "My Groups",            icon: Users,      href: "/groups",      disabled: true  },
  { label: "Assignments",          icon: FileText,   href: "/assignments", disabled: false },
  { label: "AI Teacher's Toolkit", icon: Wand2,      href: "/toolkit",     disabled: true  },
  { label: "My Library",           icon: Library,    href: "/library",     disabled: true  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <span>V</span>
        </div>
        <span className="logo-text">VedaAI</span>
      </div>

      {/* Create Assignment CTA */}
      <Link href="/assignments/new" className="create-btn">
        <Sparkles size={16} />
        Create Assignment
      </Link>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          if (item.disabled) {
            return (
              // Render as div — not a Link — so it's truly unclickable
              <div
                key={item.href}
                className="nav-item nav-disabled"
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "active" : ""}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <div className="nav-item nav-disabled">
          <Settings size={18} />
          <span>Settings</span>
        </div>

        <div className="school-card">
          <div className="school-avatar">
            <div className="school-avatar-fallback">N</div>
          </div>
          <div>
            <p className="school-name">Delhi Public School</p>
            <p className="school-sub">Bokaro Steel City</p>
          </div>
        </div>
      </div>
    </aside>
  );
}