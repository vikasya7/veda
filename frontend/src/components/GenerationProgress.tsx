"use client";

interface Props {
  progress: number;
  message: string;
  status: string;
}

export default function GenerationProgress({ progress, message, status }: Props) {
  return (
    <div className="progress-screen">
      <div className="progress-card">
        {/* Animated icon */}
        <div className="progress-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="#E8440A" strokeWidth="3" strokeOpacity="0.2"/>
            <circle
              cx="32" cy="32" r="28"
              stroke="#E8440A" strokeWidth="3"
              strokeDasharray={`${(progress / 100) * 175.9} 175.9`}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
            <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="600" fill="#1A1A1A">
              {progress}%
            </text>
          </svg>
        </div>

        <h2 className="progress-title">Generating Your Question Paper</h2>
        <p className="progress-message">{message || "Please wait..."}</p>

        {/* Progress bar */}
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="progress-steps">
          {[
            { label: "Analyzing requirements", threshold: 25 },
            { label: "Building prompt",        threshold: 40 },
            { label: "AI generating",          threshold: 75 },
            { label: "Validating output",       threshold: 90 },
            { label: "Saving paper",            threshold: 100 },
          ].map((step) => (
            <div key={step.label} className={`progress-step ${progress >= step.threshold ? "done" : ""}`}>
              <span className="step-dot" />
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        {status === "failed" && (
          <p className="progress-error">Generation failed. Please try again.</p>
        )}
      </div>
    </div>
  );
}