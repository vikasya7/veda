"use client";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-illustration">
        {/* Magnifying glass with X illustration matching Figma */}
        <svg width="220" height="200" viewBox="0 0 220 200" fill="none">
          <circle cx="110" cy="95" r="75" fill="#F0F0F0" />
          {/* Document */}
          <rect x="85" y="40" width="80" height="95" rx="6" fill="white" stroke="#E0E0E0" strokeWidth="1.5"/>
          <rect x="95" y="58" width="50" height="5" rx="2" fill="#D0D0D0"/>
          <rect x="95" y="70" width="40" height="4" rx="2" fill="#E0E0E0"/>
          <rect x="95" y="80" width="45" height="4" rx="2" fill="#E0E0E0"/>
          <rect x="95" y="90" width="35" height="4" rx="2" fill="#E0E0E0"/>
          {/* Magnifier */}
          <circle cx="118" cy="108" r="38" fill="white" stroke="#CCCCCC" strokeWidth="2.5"/>
          <circle cx="118" cy="108" r="30" fill="#F8F8F8" stroke="#E0E0E0" strokeWidth="1"/>
          {/* X mark */}
          <line x1="105" y1="95" x2="131" y2="121" stroke="#E8440A" strokeWidth="5" strokeLinecap="round"/>
          <line x1="131" y1="95" x2="105" y2="121" stroke="#E8440A" strokeWidth="5" strokeLinecap="round"/>
          {/* Handle */}
          <line x1="142" y1="132" x2="165" y2="158" stroke="#AAAAAA" strokeWidth="7" strokeLinecap="round"/>
          {/* Sparkles */}
          <path d="M72 130 L74 124 L76 130 L82 132 L76 134 L74 140 L72 134 L66 132 Z" fill="#4A90D9" opacity="0.7"/>
          <circle cx="175" cy="100" r="4" fill="#4A90D9" opacity="0.6"/>
          {/* Pencil line */}
          <path d="M62 68 Q72 58 80 72" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
      </div>

      <h2 className="empty-title">No assignments yet</h2>
      <p className="empty-desc">
        Create your first assignment to start collecting and grading student<br />
        submissions. You can set up rubrics, define marking criteria, and let AI<br />
        assist with grading.
      </p>

      <Link href="/assignments/new" className="empty-cta">
        <Plus size={18} />
        Create Your First Assignment
      </Link>
    </div>
  );
}