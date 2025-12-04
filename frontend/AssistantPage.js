// src/pages/AssistantPage.js
import React, { useState } from "react";

const API_BASE = "http://127.0.0.1:5001";

function splitSections(markdown) {
  // Very simple parser: split on headings that start with "### "
  const sections = {};
  if (!markdown) return sections;

  const parts = markdown.split(/^###\s+/m).filter(Boolean);

  parts.forEach((block) => {
    const lines = block.split(/\r?\n/);
    const [titleLine, ...rest] = lines;
    const title = titleLine.trim();
    const content = rest.join("\n").trim();
    sections[title] = content;
  });

  return sections;
}

export default function AssistantPage() {
  const [note, setNote] = useState("Explain API in simple terms");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null); // holds full API response

  async function handleAsk() {
    if (!note.trim()) return;

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const res = await fetch(`${API_BASE}/api/assistant`, {
        // 👆 match your Flask route
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_text: note,
          patient: { age: 40, sex: "F" }, // demo values
          user: { id: "demo-user", role: "clinician" },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      // Save to state
      setAnalysis(data);
      saveToLocalHistory(note, data);
    } catch (e) {
      console.error(e);
      setError("Something went wrong talking to the backend.");
    } finally {
      setLoading(false);
    }
  }

  function saveToLocalHistory(noteText, result) {
    const entry = {
      id: result.analysis_id || `LOCAL-${Date.now()}`,
      note: noteText,
      llm_analysis: result.llm_analysis,
      created_at: new Date().toISOString(),
    };

    const existing = JSON.parse(
      localStorage.getItem("assistantHistory") || "[]"
    );
    const updated = [entry, ...existing].slice(0, 50);
    localStorage.setItem("assistantHistory", JSON.stringify(updated));
  }

  const sections = analysis ? splitSections(analysis.llm_analysis || "") : {};

  return (
    <div className="page page-assistant">
      <h1 className="page-title">Ask the LLM Assistant</h1>

      <div className="card card-input">
        <label className="field-label">Your question or clinical note</label>
        <textarea
          className="input textarea"
          rows={8}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Type your question or clinical-style note here..."
        />

        <button
          className="btn btn-primary btn-large"
          onClick={handleAsk}
          disabled={loading}
        >
          {loading ? "Asking the assistant..." : "Ask the Assistant"}
        </button>

        {error && <p className="error-text">{error}</p>}
      </div>

      {analysis && (
        <div className="dashboard-grid">
          <div className="card">
            <h2>Summary</h2>
            <pre className="markdown-block">
              {sections["Summary"] || "No summary"}
            </pre>
          </div>

          <div className="card">
            <h2>Key Clinical Details</h2>
            <pre className="markdown-block">
              {sections["Key Clinical Details"] || "Not provided."}
            </pre>
          </div>

          <div className="card">
            <h2>Possible Clinical Considerations</h2>
            <pre className="markdown-block">
              {sections[
                "Possible Clinical Considerations (for clinician review only)"
              ] || "Not provided."}
            </pre>
          </div>

          <div className="card">
            <h2>Questions to Clarify</h2>
            <pre className="markdown-block">
              {sections["Questions to Clarify"] || "None listed."}
            </pre>
          </div>

          <div className="card">
            <h2>Safety / Red Flags</h2>
            <pre className="markdown-block">
              {sections["Safety / Red Flags"] || "None listed."}
            </pre>
          </div>

          <div className="card disclaimer-card">
            <h2>Disclaimer</h2>
            <p>{analysis.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
