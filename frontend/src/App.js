// src/App.js - Enhanced LLM Clinical Co-Pilot UI
const API_URL = "https://clinical-copilot-cn7u.onrender.com";

import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import "./App.css";

// Simple Markdown renderer component
function MarkdownRenderer({ content }) {
  if (!content) return null;
  
  const renderMarkdown = (text) => {
    // Split into lines and process
    const lines = text.split('\n');
    const elements = [];
    let inList = false;
    let listItems = [];
    
    lines.forEach((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        if (inList) {
          elements.push(<ul key={`list-${idx}`} className="md-list">{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<h3 key={idx} className="md-h3">{line.slice(4)}</h3>);
      }
      else if (line.startsWith('## ')) {
        elements.push(<h2 key={idx} className="md-h2">{line.slice(3)}</h2>);
      }
      else if (line.startsWith('# ')) {
        elements.push(<h1 key={idx} className="md-h1">{line.slice(2)}</h1>);
      }
      // List items
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        inList = true;
        listItems.push(
          <li key={idx} className="md-li">
            {renderInline(line.slice(2))}
          </li>
        );
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(line)) {
        inList = true;
        listItems.push(
          <li key={idx} className="md-li">
            {renderInline(line.replace(/^\d+\.\s/, ''))}
          </li>
        );
      }
      // Regular paragraph
      else if (line.trim()) {
        if (inList) {
          elements.push(<ul key={`list-${idx}`} className="md-list">{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<p key={idx} className="md-p">{renderInline(line)}</p>);
      }
    });
    
    if (inList && listItems.length > 0) {
      elements.push(<ul key="list-end" className="md-list">{listItems}</ul>);
    }
    
    return elements;
  };
  
  const renderInline = (text) => {
    // Bold text
    let parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => 
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
  };
  
  return <div className="markdown-content">{renderMarkdown(content)}</div>;
}

// Loading Spinner
function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p className="loading-text">Analyzing with Perplexity AI...</p>
    </div>
  );
}

// Citation Badge
function CitationBadge({ citations }) {
  if (!citations || citations.length === 0) return null;
  
  return (
    <div className="citations-section">
      <h4 className="citations-title">📚 Sources</h4>
      <div className="citations-list">
        {citations.map((url, idx) => (
          <a 
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="citation-chip"
          >
            [{idx + 1}] {new URL(url).hostname.replace('www.', '')}
          </a>
        ))}
      </div>
    </div>
  );
}

// Copy Button
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button className="copy-btn" onClick={handleCopy}>
      {copied ? '✓ Copied!' : '📋 Copy'}
    </button>
  );
}

// Theme Toggle
function ThemeToggle({ isDark, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle} title="Toggle theme">
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

// ============ HOME PAGE ============
function HomePage() {
  return (
    <div className="page page-home">
      <section className="hero">
        <div className="hero-badge">✨ Powered by Perplexity AI</div>
        <h1 className="hero-title">Clinical Co-Pilot</h1>
        <p className="hero-subtitle">
          An intelligent assistant for clinicians and medical students. 
          Get structured analysis, evidence-based insights, and real-time 
          medical literature references.
        </p>
        <div className="hero-actions">
          <Link to="/assistant" className="btn btn-primary btn-lg">
            <span className="btn-icon">🩺</span>
            Start Analysis
          </Link>
          <Link to="/drug-checker" className="btn btn-secondary">
            <span className="btn-icon">💊</span>
            Drug Interactions
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">📋</div>
          <h3>Clinical Notes</h3>
          <p>Analyze clinical notes with structured summaries, key findings, and safety alerts.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔍</div>
          <h3>Real-time Search</h3>
          <p>Powered by Perplexity's live search for current medical literature and guidelines.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📚</div>
          <h3>Citations</h3>
          <p>Every response includes source citations for verification and further reading.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚠️</div>
          <h3>Safety First</h3>
          <p>Clear disclaimers and red flag detection. Never replaces clinical judgment.</p>
        </div>
      </section>

      <div className="disclaimer-banner">
        <strong>⚠️ Prototype Only:</strong> This tool is for educational purposes. 
        Not for real patient care. Always consult licensed healthcare providers.
      </div>
    </div>
  );
}

// ============ ASSISTANT PAGE ============
function AssistantPage() {
  const [noteText, setNoteText] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const exampleQueries = [
    "What are the symptoms of Type 2 Diabetes?",
    "45-year-old male with chest pain radiating to left arm",
    "Explain the mechanism of action of metformin",
    "What are the contraindications for ACE inhibitors?",
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!noteText.trim()) return;

    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("https://clinical-copilot-cn7u.onrender.com/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_text: noteText,
          patient: { age: 40, sex: "Unknown" },
          user: { id: "demo-user", role: "clinician" },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResponse(data);
    } catch (err) {
      setError(err.message || "Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page page-assistant">
      <div className="page-header">
        <h1>Clinical Assistant</h1>
        <p>Enter a clinical question or note for AI-powered analysis</p>
      </div>

      <form onSubmit={handleSubmit} className="input-section">
        <div className="input-card">
          <label className="input-label">Your Question or Clinical Note</label>
          <textarea
            className="input-textarea"
            rows={5}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Describe symptoms, ask about medications, or paste a clinical note..."
          />
          
          <div className="example-queries">
            <span className="example-label">Try:</span>
            {exampleQueries.map((q, i) => (
              <button
                key={i}
                type="button"
                className="example-chip"
                onClick={() => setNoteText(q)}
              >
                {q.length > 40 ? q.slice(0, 40) + '...' : q}
              </button>
            ))}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                <span className="btn-icon">🔍</span>
                Analyze
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {loading && <LoadingSpinner />}

      {response && !loading && (
        <div className="response-section">
          <div className="response-header">
            <h2>Analysis Results</h2>
            <CopyButton text={response.llm_analysis} />
          </div>

          <div className="response-card">
            <MarkdownRenderer content={response.llm_analysis} />
          </div>

          {response.extracted_conditions?.conditions?.length > 0 && (
            <div className="conditions-card">
              <h4>🏷️ Extracted Conditions</h4>
              <div className="condition-chips">
                {response.extracted_conditions.conditions.map((cond, i) => (
                  <span key={i} className="condition-chip">{cond}</span>
                ))}
              </div>
            </div>
          )}

          <CitationBadge citations={response.citations} />

          <div className="disclaimer-card">
            <span className="disclaimer-icon">⚠️</span>
            <p>{response.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ DRUG INTERACTION CHECKER ============
function DrugCheckerPage() {
  const [medications, setMedications] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Example medication combinations for users to try
  const exampleCombinations = [
    { name: "Blood Thinners", meds: ["Warfarin", "Aspirin", "Ibuprofen"] },
    { name: "Pain Relief", meds: ["Advil", "Tylenol", "Excedrin"] },
    { name: "Heart Medications", meds: ["Lisinopril", "Metoprolol", "Amlodipine"] },
    { name: "Diabetes + BP", meds: ["Metformin", "Lisinopril", "Atorvastatin"] },
    { name: "Antibiotics", meds: ["Amoxicillin", "Ciprofloxacin", "Metronidazole"] },
  ];

  // Common individual medications for quick add
  const commonMedications = [
    "Aspirin", "Ibuprofen", "Acetaminophen", "Warfarin", "Lisinopril", 
    "Metformin", "Omeprazole", "Amoxicillin", "Prednisone", "Gabapentin"
  ];

  const addMedication = (med = inputValue) => {
    const medication = med.trim();
    if (medication && !medications.includes(medication)) {
      setMedications([...medications, medication]);
      setInputValue("");
    }
  };

  const removeMedication = (med) => {
    setMedications(medications.filter(m => m !== med));
  };

  const loadExampleCombination = (meds) => {
    setMedications(meds);
    setResult(null);
    setError("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMedication();
    }
  };

  async function checkInteractions() {
    if (medications.length < 2) {
      setError("Add at least 2 medications to check interactions");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("https://clinical-copilot-cn7u.onrender.com/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_text: `Check for drug-drug interactions between these medications: ${medications.join(", ")}.

For each interaction found, provide:
1. **Severity Level** (Major/Moderate/Minor)
2. **What happens** when these drugs interact
3. **Clinical recommendation** (avoid combination, monitor closely, adjust timing, etc.)
4. **Mechanism** of the interaction

Also note if any combinations are generally considered safe.`,
          patient: { age: 40, sex: "Unknown" },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to check interactions");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page page-drug-checker">
      <div className="page-header">
        <h1>💊 Drug Interaction Checker</h1>
        <p>Check for potential interactions between medications</p>
      </div>

      <div className="input-card">
        {/* Example Combinations */}
        <div className="example-section">
          <label className="input-label">Try an Example Combination:</label>
          <div className="example-combos">
            {exampleCombinations.map((combo, i) => (
              <button
                key={i}
                type="button"
                className="example-combo-btn"
                onClick={() => loadExampleCombination(combo.meds)}
              >
                <span className="combo-name">{combo.name}</span>
                <span className="combo-meds">{combo.meds.join(" + ")}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="divider"></div>

        {/* Manual Input */}
        <label className="input-label">Or Add Your Own Medications:</label>
        <div className="med-input-row">
          <input
            type="text"
            className="input-text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder='Type medication name (e.g., "Advil", "Metformin")'
          />
          <button type="button" className="btn btn-secondary" onClick={() => addMedication()}>
            + Add
          </button>
        </div>

        {/* Quick Add Common Medications */}
        <div className="quick-add-section">
          <span className="quick-add-label">Quick add:</span>
          <div className="quick-add-chips">
            {commonMedications
              .filter(med => !medications.includes(med))
              .slice(0, 6)
              .map((med, i) => (
                <button
                  key={i}
                  type="button"
                  className="quick-add-chip"
                  onClick={() => addMedication(med)}
                >
                  + {med}
                </button>
              ))}
          </div>
        </div>

        {/* Selected Medications */}
        {medications.length > 0 && (
          <div className="selected-meds">
            <label className="input-label">Selected Medications ({medications.length}):</label>
            <div className="med-chips">
              {medications.map((med, i) => (
                <span key={i} className="med-chip">
                  💊 {med}
                  <button onClick={() => removeMedication(med)} className="med-remove">×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <button 
          className="btn btn-primary btn-full" 
          onClick={checkInteractions}
          disabled={loading || medications.length < 2}
        >
          {loading ? (
            <>
              <span className="btn-spinner"></span>
              Checking Interactions...
            </>
          ) : (
            <>🔍 Check Interactions {medications.length >= 2 && `(${medications.length} drugs)`}</>
          )}
        </button>

        {medications.length === 1 && (
          <p className="helper-text">Add at least one more medication to check interactions</p>
        )}
      </div>

      {error && (
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {loading && <LoadingSpinner />}

      {result && !loading && (
        <div className="response-section">
          <div className="response-header">
            <h2>⚠️ Interaction Results</h2>
            <CopyButton text={result.llm_analysis} />
          </div>
          <div className="response-card">
            <MarkdownRenderer content={result.llm_analysis} />
          </div>
          <CitationBadge citations={result.citations} />
          <div className="disclaimer-card">
            <span className="disclaimer-icon">⚠️</span>
            <p>This is for informational purposes only. Always consult a pharmacist or physician before combining medications.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ HISTORY PAGE ============
function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const res = await fetch("https://clinical-copilot-cn7u.onrender.com/api/history");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page page-history">
      <div className="page-header">
        <h1>📜 Analysis History</h1>
        <p>Your recent queries and analyses</p>
        <button className="btn btn-secondary" onClick={loadHistory}>
          🔄 Refresh
        </button>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No history yet. Start by asking the assistant a question!</p>
          <Link to="/assistant" className="btn btn-primary">Go to Assistant</Link>
        </div>
      )}

      <div className="history-list">
        {items.map((item) => (
          <div key={item.id} className="history-card">
            <div className="history-header">
              <span className="history-id">#{item.id}</span>
              <span className="history-date">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </div>
            <p className="history-note">{item.note_text}</p>
            {item.conditions?.length > 0 && (
              <div className="history-conditions">
                {item.conditions.map((c, i) => (
                  <span key={i} className="condition-chip small">{c}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ MAIN APP ============
function App() {
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.body.className = isDark ? 'dark-theme' : 'light-theme';
  }, [isDark]);

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="nav-content">
          <Link to="/" className="nav-brand">
            <span className="brand-icon">🩺</span>
            <span className="brand-text">Clinical Co-Pilot</span>
          </Link>

          <nav className="nav-links">
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
            <Link to="/assistant" className={location.pathname === '/assistant' ? 'active' : ''}>Assistant</Link>
            <Link to="/drug-checker" className={location.pathname === '/drug-checker' ? 'active' : ''}>Drug Checker</Link>
            <Link to="/history" className={location.pathname === '/history' ? 'active' : ''}>History</Link>
          </nav>

          <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
        </div>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/drug-checker" element={<DrugCheckerPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>
          Clinical Co-Pilot · Powered by <strong>Perplexity AI</strong> · 
          <span className="footer-warning"> Prototype only — not medical advice</span>
        </p>
      </footer>
    </div>
  );
}

export default App;