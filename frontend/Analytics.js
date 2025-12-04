// src/pages/AnalyticsPage.js
import React, { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("assistantHistory") || "[]");
    setCount(stored.length);
  }, []);

  return (
    <div className="page">
      <h1>Analytics (demo)</h1>
      <p>Total prompts in this browser: <strong>{count}</strong></p>
      <p>Later we can add charts by time of day, length of notes, etc.</p>
    </div>
  );
}
