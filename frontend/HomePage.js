// src/pages/HomePage.js
import React from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="page page-home">
      <section className="hero">
        <h1>LLM Clinical Co-Pilot</h1>
        <p>
          Prototype web app that helps clinicians and students quickly analyze
          clinical notes using a Large Language Model. Not for real patient care.
        </p>
        <div className="hero-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={() => navigate("/assistant")}
          >
            Try the Assistant
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/history")}
          >
            View Demo History
          </button>
        </div>
      </section>
    </div>
  );
}
