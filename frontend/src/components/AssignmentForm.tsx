"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Minus } from "lucide-react";
import { useAssignmentStore } from "../store/assignmentStore";
import UploadZone from "./UploadZone";

const QUESTION_TYPE_OPTIONS = [
  "Multiple Choice Questions",
  "Short Answer",
  "Long Answer",
  "True / False",
];

const TYPE_MAP: Record<string, string> = {
  "Multiple Choice Questions": "mcq",
  "Short Answer": "short",
  "Long Answer": "long",
  "True / False": "true_false",
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AssignmentForm() {
  const router = useRouter();
  const { form, setForm, setCurrentAssignmentId, setGenerationState, resetForm } = useAssignmentStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addQuestionType = () => {
    setForm({
      questionTypes: [
        ...form.questionTypes,
        { id: Date.now().toString(), type: "Short Answer", count: 2, marks: 2 },
      ],
    });
  };

  const removeQuestionType = (id: string) => {
    setForm({ questionTypes: form.questionTypes.filter((q) => q.id !== id) });
  };

  const updateQuestionType = (id: string, field: string, value: unknown) => {
    setForm({
      questionTypes: form.questionTypes.map((q) =>
        q.id === id ? { ...q, [field]: value } : q
      ),
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.grade.trim()) e.grade = "Grade is required";
    if (form.questionTypes.length === 0) e.questionTypes = "Add at least one question type";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const totalQuestions = form.questionTypes.reduce((s, q) => s + q.count, 0);
      const marksPerQuestion = form.questionTypes[0]?.marks || 1;
      const easy = Math.ceil(totalQuestions * 0.4);
      const hard = Math.floor(totalQuestions * 0.2);
      const medium = totalQuestions - easy - hard;

      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("subject", form.subject);
      fd.append("grade", form.grade);
      if (form.dueDate) fd.append("dueDate", new Date(form.dueDate).toISOString());
      fd.append("totalQuestions", String(totalQuestions));
      fd.append("marksPerQuestion", String(marksPerQuestion));
      fd.append("questionTypes", JSON.stringify(form.questionTypes.map((q) => TYPE_MAP[q.type] || "mcq")));
      fd.append("difficultyDistribution[easy]", String(easy));
      fd.append("difficultyDistribution[medium]", String(medium));
      fd.append("difficultyDistribution[hard]", String(hard));
      if (form.instructions) fd.append("instructions", form.instructions);
      if (form.file) fd.append("file", form.file);

      const res = await fetch(`${API}/api/assignments`, { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed");

      setCurrentAssignmentId(data.data.assignmentId);
      setGenerationState({ status: "queued", progress: 0, message: "Job queued..." });
      resetForm();
      router.push(`/assignments/${data.data.assignmentId}`);
    } catch (err) {
        if(err instanceof Error)
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      {/* Progress bar */}
      <div className="form-progress">
        <div className="form-progress-bar" />
      </div>

      <div className="form-card">
        <div className="form-card-header">
          <h2 className="form-section-title">Assignment Details</h2>
          <p className="form-section-sub">Basic information about your assignment</p>
        </div>

        {/* Upload */}
        <UploadZone />
        <p className="upload-caption">Upload images of your preferred document/image</p>

        {/* Title */}
        <div className="form-field">
          <label>Assignment Title</label>
          <input
            className={`form-input ${errors.title ? "error" : ""}`}
            placeholder="e.g. Science Quiz – Chapter 5"
            value={form.title}
            onChange={(e) => setForm({ title: e.target.value })}
          />
          {errors.title && <span className="field-error">{errors.title}</span>}
        </div>

        {/* Subject + Grade row */}
        <div className="form-row">
          <div className="form-field">
            <label>Subject</label>
            <input
              className={`form-input ${errors.subject ? "error" : ""}`}
              placeholder="e.g. Physics"
              value={form.subject}
              onChange={(e) => setForm({ subject: e.target.value })}
            />
            {errors.subject && <span className="field-error">{errors.subject}</span>}
          </div>
          <div className="form-field">
            <label>Grade / Class</label>
            <input
              className={`form-input ${errors.grade ? "error" : ""}`}
              placeholder="e.g. Grade 10"
              value={form.grade}
              onChange={(e) => setForm({ grade: e.target.value })}
            />
            {errors.grade && <span className="field-error">{errors.grade}</span>}
          </div>
        </div>

        {/* Due Date */}
        <div className="form-field">
          <label>Due Date</label>
          <input
            type="date"
            className="form-input"
            value={form.dueDate}
            onChange={(e) => setForm({ dueDate: e.target.value })}
          />
        </div>

        {/* Question Types */}
        <div className="form-field">
          <div className="qt-header">
            <span className="qt-col-type">Question Type</span>
            <span className="qt-col-num">No. of Questions</span>
            <span className="qt-col-marks">Marks</span>
          </div>

          {form.questionTypes.map((qt) => (
            <div key={qt.id} className="qt-row">
              <select
                className="form-input qt-select"
                value={qt.type}
                onChange={(e) => updateQuestionType(qt.id, "type", e.target.value)}
              >
                {QUESTION_TYPE_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>

              <button
                className="qt-remove"
                onClick={() => removeQuestionType(qt.id)}
                disabled={form.questionTypes.length === 1}
              >
                <X size={14} />
              </button>

              {/* Count stepper */}
              <div className="stepper">
                <button onClick={() => updateQuestionType(qt.id, "count", Math.max(1, qt.count - 1))}>
                  <Minus size={14} />
                </button>
                <span>{qt.count}</span>
                <button onClick={() => updateQuestionType(qt.id, "count", qt.count + 1)}>
                  <Plus size={14} />
                </button>
              </div>

              {/* Marks stepper */}
              <div className="stepper">
                <button onClick={() => updateQuestionType(qt.id, "marks", Math.max(1, qt.marks - 1))}>
                  <Minus size={14} />
                </button>
                <span>{qt.marks}</span>
                <button onClick={() => updateQuestionType(qt.id, "marks", qt.marks + 1)}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}

          <button className="add-qt-btn" onClick={addQuestionType}>
            <Plus size={14} /> Add Question Type
          </button>
          {errors.questionTypes && <span className="field-error">{errors.questionTypes}</span>}
        </div>

        {/* Instructions */}
        <div className="form-field">
          <label>Additional Instructions <span className="optional">(optional)</span></label>
          <textarea
            className="form-input form-textarea"
            placeholder="Any specific topics, instructions or context for the AI..."
            value={form.instructions}
            onChange={(e) => setForm({ instructions: e.target.value })}
            rows={3}
          />
        </div>

        {errors.submit && <p className="submit-error">{errors.submit}</p>}

        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Creating..." : "Generate Question Paper"}
        </button>
      </div>
    </div>
  );
}