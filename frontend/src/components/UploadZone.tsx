"use client";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useAssignmentStore } from "../store/assignmentStore";

export default function UploadZone() {
  const { form, setForm } = useAssignmentStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    const allowed = ["application/pdf", "text/plain"];
    if (!allowed.includes(file.type)) {
      alert("Only PDF and TXT files allowed");
      return;
    }
    setForm({ file });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={`upload-zone ${dragging ? "dragging" : ""} ${form.file ? "has-file" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {form.file ? (
        <div className="upload-file-info">
          <div className="upload-icon">
            <Upload size={24} />
          </div>
          <p className="upload-filename">{form.file.name}</p>
          <p className="upload-filesize">{(form.file.size / 1024 / 1024).toFixed(2)} MB</p>
          <button
            className="upload-remove"
            onClick={(e) => { e.stopPropagation(); setForm({ file: null }); }}
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <div className="upload-icon">
            <Upload size={28} />
          </div>
          <p className="upload-label">Choose a file or drag &amp; drop it here</p>
          <p className="upload-hint">PDF, TXT, upto 10MB</p>
          <button
            className="browse-btn"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          >
            Browse Files
          </button>
        </>
      )}
    </div>
  );
}