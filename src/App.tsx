import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { LANGS, LangId } from "./languages";
import Logo from "./Logo";
import "./styles.css";

type Kind = "log" | "info" | "warn" | "error" | "sys";
interface Line {
  kind: Kind;
  text: string;
}

const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  },
};

const loadCode = (id: LangId) => store.get("ae:code:" + id) ?? LANGS[id].sample;

function buildFrame(js: string): string {
  const safe = js.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><body><script>
const send=(k,a)=>parent.postMessage({__run:true,kind:k,text:a.map(x=>{try{return typeof x==="string"?x:(JSON.stringify(x,null,2)??String(x))}catch{return String(x)}}).join(" ")},"*");
["log","info","warn","error"].forEach(k=>{console[k]=(...a)=>send(k,a)});
window.addEventListener("error",e=>send("error",[e.message]));
window.addEventListener("unhandledrejection",e=>send("error",[String(e.reason)]));
</script><script>
(async()=>{try{
${safe}
}catch(e){send("error",[String(e)])}})();
</script></body></html>`;
}

export default function App() {
  const [lang, setLang] = useState<LangId>(() => (store.get("ae:lang") as LangId) || "javascript");
  const [code, setCode] = useState<string>(() => loadCode(lang));
  const [theme, setTheme] = useState<"dark" | "light">(() => (store.get("ae:theme") as "dark" | "light") || "dark");
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState<"on" | "off">("on");
  const [viewMode, setViewMode] = useState<"both" | "code" | "output">("both");
  const [lines, setLines] = useState<Line[]>([]);
  const [frameDoc, setFrameDoc] = useState("");
  const [runId, setRunId] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const runRef = useRef<() => void>(() => {});

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    store.set("ae:theme", theme);
  }, [theme]);

  // Detect mobile width on mount to set sensible default view
  useEffect(() => {
    if (window.innerWidth < 640) {
      setViewMode("code");
    }
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || !e.data?.__run) return;
      setLines((l) => [...l, { kind: e.data.kind as Kind, text: String(e.data.text) }]);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const changeLang = (id: LangId) => {
    store.set("ae:lang", id);
    setLang(id);
    setCode(loadCode(id));
    setLines([]);
    setFrameDoc("");
  };

  const onChange = (v?: string) => {
    const next = v ?? "";
    setCode(next);
    store.set("ae:code:" + lang, next);
  };

  const run = useCallback(async () => {
    setIsRunning(true);
    setLines([]);
    
    // On small screens, automatically switch to output or both so user immediately sees results
    if (window.innerWidth < 768 && viewMode === "code") {
      setViewMode("output");
    }

    if (!LANGS[lang].runnable) {
      setLines([{ kind: "sys", text: LANGS[lang].label + " cannot run in the browser. Edit and download it, or switch to JavaScript, TypeScript or HTML." }]);
      setIsRunning(false);
      return;
    }
    let source = code;
    if (lang === "typescript") {
      try {
        const monaco = monacoRef.current as any;
        const model = editorRef.current?.getModel();
        const getWorker = await monaco.languages.typescript.getTypeScriptWorker();
        const client = await getWorker(model!.uri);
        const out = await client.getEmitOutput(model!.uri.toString());
        source = out.outputFiles[0].text;
      } catch (err) {
        setLines([{ kind: "error", text: "TypeScript compile failed: " + String(err) }]);
        setIsRunning(false);
        return;
      }
    }
    setFrameDoc(lang === "html" ? code : buildFrame(source));
    setRunId((n) => n + 1);
    setTimeout(() => setIsRunning(false), 300);
  }, [code, lang, viewMode]);

  runRef.current = run;

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "main." + LANGS[lang].ext;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const reset = () => {
    if (window.confirm("Reset code to default sample?")) {
      setCode(LANGS[lang].sample);
      store.set("ae:code:" + lang, LANGS[lang].sample);
      setLines([]);
    }
  };

  const isHtml = lang === "html";

  return (
    <div className="app">
      <header className="bar">
        <div className="bar-top">
          <div className="brand">
            <Logo size={28} />
            <div className="brand-text">
              <span className="name">Aditya Editor</span>
              <span className="badge">{LANGS[lang].label}</span>
            </div>
          </div>

          <div className="view-segmented" role="tablist" aria-label="Layout View">
            <button
              role="tab"
              aria-selected={viewMode === "code"}
              className={`seg-btn ${viewMode === "code" ? "active" : ""}`}
              onClick={() => setViewMode("code")}
              title="Show Editor Only"
            >
              Code
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "both"}
              className={`seg-btn seg-split ${viewMode === "both" ? "active" : ""}`}
              onClick={() => setViewMode("both")}
              title="Split View (Editor & Output)"
            >
              Split
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "output"}
              className={`seg-btn ${viewMode === "output" ? "active" : ""}`}
              onClick={() => setViewMode("output")}
              title="Show Output Only"
            >
              {isHtml ? "Preview" : "Console"}
              {lines.length > 0 && <span className="dot" />}
            </button>
          </div>

          <button
            className={`run-btn ${isRunning ? "running" : ""}`}
            onClick={run}
            title="Execute code (Ctrl/Cmd + Enter)"
          >
            <span className="run-icon">▶</span> Run
          </button>
        </div>

        <div className="tools-bar">
          <div className="tools-group">
            <label className="select-wrap">
              <span className="visually-hidden">Language</span>
              <select value={lang} onChange={(e) => changeLang(e.target.value as LangId)} aria-label="Language">
                {(Object.keys(LANGS) as LangId[]).map((id) => (
                  <option key={id} value={id}>
                    {LANGS[id].label}
                  </option>
                ))}
              </select>
            </label>

            <div className="btn-group" aria-label="Font sizing">
              <button onClick={() => setFontSize((s) => Math.max(11, s - 1))} aria-label="Smaller font size" title="Smaller Font">A-</button>
              <button onClick={() => setFontSize((s) => Math.min(24, s + 1))} aria-label="Larger font size" title="Larger Font">A+</button>
            </div>

            <button
              className="icon-btn"
              onClick={() => setWordWrap(w => w === "on" ? "off" : "on")}
              title={`Word wrap: ${wordWrap}`}
              aria-label="Toggle Word Wrap"
            >
              Wrap: {wordWrap.toUpperCase()}
            </button>
          </div>

          <div className="tools-group right-tools">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle Dark/Light Mode">
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button onClick={reset} title="Reset to sample code">Reset</button>
            <button onClick={download} title="Download file">Download</button>
          </div>
        </div>
      </header>

      <main className={`split view-${viewMode}`}>
        {(viewMode === "code" || viewMode === "both") && (
          <section className="pane editor" aria-label="Code Editor">
            <Editor
              height="100%"
              path={"main." + LANGS[lang].ext}
              language={lang}
              value={code}
              theme={theme === "dark" ? "vs-dark" : "light"}
              onChange={onChange}
              onMount={onMount}
              options={{
                fontSize,
                wordWrap,
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 2,
                lineNumbersMinChars: 3,
                folding: true,
                padding: { top: 12, bottom: 12 }
              }}
            />
          </section>
        )}

        {(viewMode === "output" || viewMode === "both") && (
          <section className="pane output" aria-label="Output">
            <div className="outhead">
              <div className="outhead-title">
                <span className="out-indicator" />
                <span>{isHtml ? "Live Preview" : "Console Output"}</span>
                {!isHtml && lines.length > 0 && <span className="count-badge">{lines.length} lines</span>}
              </div>
              <div className="outhead-actions">
                {!isHtml && <button onClick={() => setLines([])} className="clear-btn">Clear</button>}
                {viewMode === "output" && (
                  <button onClick={() => setViewMode("code")} className="switch-code-btn">Back to Code</button>
                )}
              </div>
            </div>
            {!isHtml && (
              <pre className="console">
                {lines.length === 0 ? (
                  <div className="hint-container">
                    <span className="hint-icon">💡</span>
                    <span className="hint">Press <strong>Run</strong> or <strong>Ctrl/Cmd + Enter</strong> to execute your code.</span>
                  </div>
                ) : (
                  lines.map((l, i) => (
                    <div key={i} className={"ln " + l.kind}>
                      <span className="ln-prefix">{l.kind === "error" ? "✖ " : l.kind === "warn" ? "▲ " : "› "}</span>
                      <span className="ln-text">{l.text}</span>
                    </div>
                  ))
                )}
              </pre>
            )}
            {isHtml && !frameDoc && (
              <div className="hint-container pad">
                <span className="hint-icon">🌐</span>
                <span className="hint">Click <strong>Run</strong> above to render the live HTML preview.</span>
              </div>
            )}
            <iframe
              key={runId}
              ref={frameRef}
              title="Sandbox Preview"
              sandbox="allow-scripts allow-modals"
              srcDoc={frameDoc}
              className={isHtml && frameDoc ? "preview" : "hidden"}
            />
          </section>
        )}
      </main>
    </div>
  );
}
