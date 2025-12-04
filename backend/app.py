from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import os, json, requests

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# -----------------------------
# Perplexity Configuration
# -----------------------------
PERPLEXITY_API_KEY = os.environ.get("PERPLEXITY_API_KEY")
LLM_MODEL = os.environ.get("LLM_MODEL", "sonar-pro")

HISTORY = []

def call_perplexity(system_prompt: str, user_prompt: str, temperature: float = 0.4, max_tokens: int = 1200) -> dict:
    result = {"content": "LLM not configured. Set PERPLEXITY_API_KEY to enable.", "citations": [], "usage": {}}
    if not PERPLEXITY_API_KEY:
        return result
    try:
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={"Authorization": f"Bearer {PERPLEXITY_API_KEY}", "Content-Type": "application/json"},
            json={"model": LLM_MODEL, "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}], "temperature": temperature, "max_tokens": max_tokens},
            timeout=60
        )
        response.raise_for_status()
        data = response.json()
        result["content"] = data["choices"][0]["message"]["content"]
        result["citations"] = data.get("citations", [])
        result["usage"] = data.get("usage", {})
    except Exception as e:
        print(f"Perplexity API call failed: {e}")
        result["content"] = f"API call failed: {str(e)}"
    return result

def run_clinical_copilot_llm(payload: dict) -> dict:
    note_text = payload.get("note_text", "")
    patient = payload.get("patient", {})
    age, sex = patient.get("age"), patient.get("sex")

    system_prompt = """You are an AI assistant used in a healthcare software prototype. Your audience is clinicians and software developers, NOT patients. Given a clinical-style note, generate a structured analysis. SAFETY RULES: Do NOT make final diagnoses. Do NOT prescribe treatments. Use language like 'possible considerations'. Include disclaimers that this is NOT medical advice."""

    user_prompt = f"""Patient context: age: {age}, sex: {sex}.
Clinical note: {note_text}

Produce analysis in Markdown:
### Summary
### Key Clinical Details  
### Possible Clinical Considerations
### Documentation Improvements
### Questions to Clarify
### Safety / Red Flags

End with disclaimer this is prototype only."""

    llm_response = call_perplexity(system_prompt, user_prompt, 0.3, 1500)
    return {"llm_analysis": llm_response["content"], "citations": llm_response["citations"], "disclaimer": "Prototype AI - NOT medical advice."}

def run_condition_extractor_llm(note_text: str) -> dict:
    if not PERPLEXITY_API_KEY:
        return {"conditions": [], "raw": "LLM not configured."}
    try:
        llm_response = call_perplexity("Extract conditions as JSON: {\"conditions\": [...]}", f"Extract from: {note_text}", 0.1, 300)
        content = llm_response["content"].strip()
        if "```" in content:
            content = content.split("```")[1].replace("json", "").strip()
        data = json.loads(content)
        return {"conditions": data.get("conditions", []), "raw": content}
    except:
        return {"conditions": [], "raw": "Failed"}

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "running", "provider": "Perplexity", "model": LLM_MODEL, "configured": bool(PERPLEXITY_API_KEY)})

@app.route("/api/assistant", methods=["POST"])
def assistant():
    data = request.get_json(force=True) or {}
    note_text = data.get("note_text") or data.get("prompt") or ""
    if not note_text:
        return jsonify({"error": "Missing note_text"}), 400
    patient = data.get("patient", {})
    user = data.get("user", {"id": "demo-user", "role": "clinician"})
    llm_result = run_clinical_copilot_llm({"note_text": note_text, "patient": patient, "user": user})
    cond_result = run_condition_extractor_llm(note_text)
    created_at = datetime.utcnow().isoformat() + "Z"
    HISTORY.insert(0, {"id": len(HISTORY)+1, "created_at": created_at, "note_text": note_text, "conditions": cond_result.get("conditions", []), "user": user})
    if len(HISTORY) > 50: HISTORY.pop()
    return jsonify({"analysis_id": f"PPLX-{datetime.now().strftime('%Y%m%d%H%M%S')}", "created_at": created_at, **llm_result, "extracted_conditions": cond_result, "user": user})

@app.route("/api/history", methods=["GET"])
def get_history():
    return jsonify({"items": HISTORY[:50]})

if __name__ == "__main__":
    print("\n" + "="*50)
    print("  LLM Clinical Co-Pilot - PERPLEXITY")
    print("="*50)
    print(f"  Model: {LLM_MODEL}")
    print(f"  API Key: {'✓ SET' if PERPLEXITY_API_KEY else '✗ NOT SET'}")
    print("="*50 + "\n")
    app.run(host="0.0.0.0", port=5001, debug=True)