"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useAssignmentStore, Assignment } from "../store/assignmentStore";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { removeAssignment } = useAssignmentStore();
  const router = useRouter();

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB").replace(/\//g, "-");
  };

  const handleDelete = async () => {
    try {
      await fetch(`${API}/api/assignments/${assignment._id}`, { method: "DELETE" });
      removeAssignment(assignment._id);
    } catch (e) {
      console.error(e);
    }
    setMenuOpen(false);
  };

  const handleView = () => {
    router.push(`/assignments/${assignment._id}`);
    setMenuOpen(false);
  };

  return (
    <div className="assignment-card">
      <div className="card-header">
        <h3 className="card-title">{assignment.title || "Quiz on Electricity"}</h3>
        <div className="card-menu-wrap">
          <button className="card-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <button onClick={handleView}>View Assignment</button>
              <button onClick={handleDelete} className="danger">Delete</button>
            </div>
          )}
        </div>
      </div>

      {/* Status badge */}
      {assignment.status !== "completed" && (
        <span className={`status-badge status-${assignment.status}`}>
          {assignment.status}
        </span>
      )}

      <div className="card-footer">
        <span>
          <strong>Assigned on</strong> : {formatDate(assignment.createdAt)}
        </span>
        {assignment.dueDate && (
          <span>
            <strong>Due</strong> : {formatDate(assignment.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}