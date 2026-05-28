"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter } from "lucide-react";
import { useAssignmentStore } from "../../store/assignmentStore";
import AssignmentCard from "../../components/AssignmentCard";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AssignmentsPage() {
  const { assignments, setAssignments } = useAssignmentStore();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API}/api/assignments`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setAssignments(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setAssignments]);

  const filtered = assignments.filter((a) =>
    (a.title || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-grid">
          {[1, 2, 3, 4].map((i) => <div key={i} className="card-skeleton" />)}
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (assignments.length === 0) {
    return (
      <div className="empty-state">
        {/* Illustration */}
        <div className="empty-illustration">
          <svg width="220" height="200" viewBox="0 0 220 200" fill="none">
            <circle cx="110" cy="95" r="75" fill="#F0F0F0"/>
            <rect x="85" y="40" width="80" height="95" rx="6" fill="white" stroke="#E0E0E0" strokeWidth="1.5"/>
            <rect x="95" y="58" width="50" height="5" rx="2" fill="#D0D0D0"/>
            <rect x="95" y="70" width="40" height="4" rx="2" fill="#E0E0E0"/>
            <rect x="95" y="80" width="45" height="4" rx="2" fill="#E0E0E0"/>
            <rect x="95" y="90" width="35" height="4" rx="2" fill="#E0E0E0"/>
            <circle cx="118" cy="108" r="38" fill="white" stroke="#CCCCCC" strokeWidth="2.5"/>
            <circle cx="118" cy="108" r="30" fill="#F8F8F8" stroke="#E0E0E0" strokeWidth="1"/>
            <line x1="105" y1="95" x2="131" y2="121" stroke="#E8440A" strokeWidth="5" strokeLinecap="round"/>
            <line x1="131" y1="95" x2="105" y2="121" stroke="#E8440A" strokeWidth="5" strokeLinecap="round"/>
            <line x1="142" y1="132" x2="165" y2="158" stroke="#AAAAAA" strokeWidth="7" strokeLinecap="round"/>
            <path d="M72 130 L74 124 L76 130 L82 132 L76 134 L74 140 L72 134 L66 132 Z" fill="#4A90D9" opacity="0.7"/>
            <circle cx="175" cy="100" r="4" fill="#4A90D9" opacity="0.6"/>
          </svg>
        </div>
        <h2 className="empty-title">No assignments yet</h2>
        <p className="empty-desc">
          Create your first assignment to start collecting and grading student
          submissions. You can set up rubrics, define marking criteria, and let AI
          assist with grading.
        </p>
        <button className="empty-cta" onClick={() => router.push("/assignments/new")}>
          <Plus size={18} /> Create Your First Assignment
        </button>
      </div>
    );
  }

  // ── Filled state ─────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      {/* Heading */}
      <div className="page-heading">
        <span className="status-dot green" />
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="page-sub">Manage and create assignments for your classes.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="list-toolbar">
        <button className="filter-btn">
          <Filter size={14} /> Filter By
        </button>
        <div className="search-wrap">
          <Search size={14} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search Assignment"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="assignments-grid">
        {filtered.map((a) => (
          <AssignmentCard key={a._id} assignment={a} />
        ))}
      </div>

      {/* Floating CTA */}
      <button className="floating-cta" onClick={() => router.push("/assignments/new")}>
        <Plus size={16} /> Create Assignment
      </button>
    </div>
  );
}