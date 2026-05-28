"use client";
import { useRef } from "react";
import { Download, RefreshCw } from "lucide-react";
import { GeneratedPaper } from "../store/assignmentStore";

interface Props {
  paper: GeneratedPaper;
  assignmentId: string;
  onRegenerate?: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   "badge-easy",
  medium: "badge-medium",
  hard:   "badge-hard",
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function QuestionPaper({ paper, assignmentId, onRegenerate }: Props) {
  const paperRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    try {
      const res = await fetch(`${API}/api/assignments/${assignmentId}/pdf`);
      if (!res.ok) throw new Error("PDF not available");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `question-paper-${assignmentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to print
      window.print();
    }
  };

  const totalMarks = paper.sections.reduce(
    (sum, s) => sum + s.questions.reduce((q, qn) => q + qn.marks, 0), 0
  );
  const totalQuestions = paper.sections.reduce((s, sec) => s + sec.questions.length, 0);
  const timeAllowed = Math.max(30, totalQuestions * 3);

  return (
    <div className="output-page">
      {/* Dark banner — matches Figma exactly */}
      <div className="output-banner">
        <p className="banner-text">
          Certainly! Here are customized Question Paper for your{" "}
          <strong>{paper.metadata.grade} {paper.metadata.subject}</strong> class:
        </p>
        <div className="banner-actions">
          <button className="pdf-btn" onClick={handleDownload}>
            <Download size={16} />
            Download as PDF
          </button>
          {onRegenerate && (
            <button className="regen-btn" onClick={onRegenerate}>
              <RefreshCw size={16} />
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Paper — matches Figma exactly */}
      <div className="paper-card" ref={paperRef} id="question-paper">
        {/* School header */}
        <div className="paper-header">
          <h1 className="paper-school">Delhi Public School, Sector-4, Bokaro</h1>
          <p className="paper-subject">Subject: {paper.metadata.subject}</p>
          <p className="paper-grade">Class: {paper.metadata.grade}</p>
        </div>

        {/* Meta row */}
        <div className="paper-meta">
          <span>Time Allowed: {timeAllowed} minutes</span>
          <span>Maximum Marks: {totalMarks}</span>
        </div>

        <p className="paper-instruction">All questions are compulsory unless stated otherwise.</p>

        {/* Student info */}
        <div className="student-info">
          <p>Name: <span className="info-line" /></p>
          <p>Roll Number: <span className="info-line" /></p>
          <p>Class: {paper.metadata.grade} Section: <span className="info-line short" /></p>
        </div>

        {/* Sections */}
        {paper.sections.map((section, si) => (
          <div key={si} className="paper-section">
            <h2 className="section-title">{section.title}</h2>
            <p className="section-type-label">
              {section.questions[0]?.type === "mcq"
                ? "Multiple Choice Questions"
                : section.questions[0]?.type === "short"
                ? "Short Answer Questions"
                : section.questions[0]?.type === "true_false"
                ? "True or False"
                : "Long Answer Questions"}
            </p>
            <p className="section-instruction">{section.instruction}</p>

            <ol className="questions-list">
              {section.questions.map((q, qi) => (
                <li key={qi} className="question-item">
                  <div className="question-row">
                    <span className="question-text">
                      <span className={`diff-badge ${DIFFICULTY_COLORS[q.difficulty]}`}>
                        {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                      </span>{" "}
                      {q.text}
                    </span>
                    <span className="question-marks">[{q.marks} {q.marks === 1 ? "Mark" : "Marks"}]</span>
                  </div>

                  {/* MCQ options */}
                  {q.options && q.options.length > 0 && (
                    <ol className="options-list" type="a">
                      {q.options.map((opt, oi) => (
                        <li key={oi} className="option-item">{opt}</li>
                      ))}
                    </ol>
                  )}

                  {/* Answer line for non-MCQ */}
                  {(!q.options || q.options.length === 0) && (
                    <div className="answer-lines">
                      <div className="answer-line" />
                      <div className="answer-line" />
                      {q.type === "long" && (
                        <>
                          <div className="answer-line" />
                          <div className="answer-line" />
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}

        {/* Footer */}
        <div className="paper-footer">
          <p>*** End of Question Paper ***</p>
        </div>
      </div>
    </div>
  );
}