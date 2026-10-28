"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
export function CodeBlock({ code }: { code: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Kopiert");
    } catch {
      setMessage("Kopieren fehlgeschlagen. Bitte manuell markieren.");
    }
  }
  return (
    <div className="code-block">
      <div>
        <span>JAVASCRIPT · DEMO</span>
        <button onClick={copy}>
          {message === "Kopiert" ? <Check size={14} /> : <Copy size={14} />}{" "}
          {message === "Kopiert" ? "Kopiert" : "Kopieren"}
        </button>
      </div>
      <pre>
        <code>
          {code.split("\n").map((line, i) => (
            <span className="code-line" key={i}>
              <span className="line-number" aria-hidden="true">
                {i + 1}
              </span>
              <span
                className={
                  line.startsWith("//")
                    ? "syntax-comment"
                    : line.match(/const|function|return/)
                      ? "syntax-keyword"
                      : "syntax-value"
                }
              >
                {line}
                {"\n"}
              </span>
            </span>
          ))}
        </code>
      </pre>
      <span role="status" className="copy-status">
        {message}
      </span>
    </div>
  );
}
