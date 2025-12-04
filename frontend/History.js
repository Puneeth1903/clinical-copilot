// src/pages/HistoryPage.js
import React, { useEffect, useState } from "react";

export default function HistoryPage() {
  const [localHistory, setLocalHistory] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("assistantHistory") || "[]");
    setLocalHistory(stored);
  }, []);

  return (
    <div className="page">
      <h1>History (Browser only)</h1>
      {localHistory.length === 0 && <p>No local history yet.</p>}
      {localHistory.map((item) => (
        <div key={item.id} className="card history-item">
          <p className="muted">{item.created_at}</p>
          <h3>Note</h3>
          <pre className="markdown-block small">{item.note}</pre>
          <h3>LLM Analysis (preview)</h3>
          <pre className="markdown-block small">
            {(item.llm_analysis || "").slice(0, 800)}...
          </pre>
        </div>
      ))}
    </div>
  );
}
