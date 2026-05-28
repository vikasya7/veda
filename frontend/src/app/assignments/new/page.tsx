import AssignmentForm from "../../../components/AssignmentForm";

export default function NewAssignmentPage() {
  return (
    <div className="page-content">
      <div className="page-heading">
        <span className="status-dot green" />
        <div>
          <h1 className="page-title">Create Assignment</h1>
          <p className="page-sub">Set up a new assignment for your students</p>
        </div>
      </div>
      <AssignmentForm />
    </div>
  );
}