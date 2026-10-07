import { useMemo, useRef, useState } from "react";
import { stripRtf } from "rtf-to-text";

import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import DocumentUpload from "./components/DocumentUpload";
import Configuration from "./components/Configuration";
import ResultsTable from "./components/ResultsTable";

const createId = (prefix = "doc") =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

const readFileAsText = async (file) => {
  if (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf") {
    const [pdfjsLib, workerModule] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });

    try {
      const pdf = await loadingTask.promise;
      const pages = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(
          content.items
            .filter((item) => "str" in item)
            .map((item) => item.str)
            .join(" ")
        );
      }
      return pages.join("\n");
    } finally {
      await loadingTask.destroy();
    }
  }

  const text = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read selected file."));
    reader.readAsText(file);
  });
  const isRtf =
    file.name.toLowerCase().endsWith(".rtf") ||
    ["application/rtf", "application/x-rtf"].includes(file.type.toLowerCase());

  return isRtf ? stripRtf(text) : text;
};

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [documents, setDocuments] = useState([]);
  const [config, setConfig] = useState({
    shingleSize: 3,
    minHashFunctions: 100,
    bands: 20,
    rows: 5,
    threshold: 70,
  });
  const [documentMode, setDocumentMode] = useState("upload");
  const [analysis, setAnalysis] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const analysisRequestId = useRef(0);
  const activeAnalysisController = useRef(null);
  const uploadRequestId = useRef(0);

  const clearAnalysis = () => {
    analysisRequestId.current += 1;
    activeAnalysisController.current?.abort();
    activeAnalysisController.current = null;
    setAnalysis(null);
    setIsRunning(false);
    setErrorMessage("");
  };

  const currentDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          document.text && document.text.trim().length > 0
      ),
    [documents]
  );

  const statistics = useMemo(() => {
    const pairs =
      currentDocuments.length > 1
        ? (currentDocuments.length * (currentDocuments.length - 1)) / 2
        : 0;

    return {
      documents: currentDocuments.length,
      pairs,
      nearDuplicates: analysis?.nearDuplicateCount || 0,
      threshold: `${config.threshold}%`,
    };
  }, [analysis, config.threshold, currentDocuments.length]);

  const handleFiles = async (fileList) => {
    const requestId = ++uploadRequestId.current;
    clearAnalysis();

    const validFiles = Array.from(fileList).filter((file) => {
      const name = file.name.toLowerCase();
      const type = file.type.toLowerCase();
      return (
        type.startsWith("text/") ||
        type === "application/pdf" ||
        type === "application/rtf" ||
        type === "application/x-rtf" ||
        name.endsWith(".pdf") ||
        name.endsWith(".txt") ||
        name.endsWith(".rtf") ||
        name.endsWith(".md")
      );
    });

    if (validFiles.length === 0) {
      setErrorMessage("Unsupported file type. Please upload TXT, RTF, MD, or PDF files.");
      return;
    }

    setDocuments([]);

    try {
      const parsedDocuments = await Promise.all(
        validFiles.map(async (file, index) => {
          const text = await readFileAsText(file);
          return {
            id: createId(`upload-${index}`),
            name: file.name || `Uploaded Document ${index + 1}`,
            text,
            source: "upload",
            size: file.size,
            type: file.type || "text/plain",
          };
        })
      );
      if (requestId === uploadRequestId.current) {
        setDocuments(parsedDocuments);
      }
    } catch (error) {
      if (requestId === uploadRequestId.current) {
        setErrorMessage(error.message || "Unable to read the uploaded document.");
      }
    }
  };

  const addManualDocument = () => {
    uploadRequestId.current += 1;
    const nextDocument = {
      id: createId("manual"),
      name: `Document ${documents.filter((document) => document.source === "manual").length + 1}`,
      text: "",
      source: "manual",
    };

    setDocuments((previous) => [...previous, nextDocument]);
    setDocumentMode("manual");
    clearAnalysis();
  };

  const updateDocument = (id, changes) => {
    uploadRequestId.current += 1;
    setDocuments((previous) =>
      previous.map((document) =>
        document.id === id ? { ...document, ...changes } : document
      )
    );
    clearAnalysis();
  };

  const removeDocument = (id) => {
    uploadRequestId.current += 1;
    setDocuments((previous) => previous.filter((document) => document.id !== id));
    clearAnalysis();
  };

  const clearAllDocuments = () => {
    uploadRequestId.current += 1;
    setDocuments([]);
    clearAnalysis();
  };

  const runDetection = async () => {
    const payloadDocuments = currentDocuments.map((document) => ({
      name: document.name.trim() || "Untitled Document",
      text: document.text.trim(),
    }));

    if (payloadDocuments.length < 2) {
      setErrorMessage("Add at least two non-empty documents before running the analysis.");
      setAnalysis(null);
      return;
    }

    setIsRunning(true);
    setErrorMessage("");
    setAnalysis(null);

    activeAnalysisController.current?.abort();
    const controller = new AbortController();
    activeAnalysisController.current = controller;
    const requestId = ++analysisRequestId.current;

    try {
      const response = await fetch("/api/documents/analyze", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threshold: config.threshold,
          shingleSize: config.shingleSize,
          documents: payloadDocuments,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(
          errorPayload.message || "The backend could not process the analysis request."
        );
      }

      const data = await response.json();
      if (requestId !== analysisRequestId.current) {
        return;
      }

      const resultsData = Array.isArray(data.results)
        ? data.results.map((item, index) => ({
            id: `${item.documentA}-${item.documentB}-${index}`,
            documentA: item.documentA,
            documentB: item.documentB,
            similarity: Number(item.similarity),
            threshold: Number(item.threshold),
            nearDuplicate: Boolean(item.nearDuplicate),
            status: item.nearDuplicate ? "Near Duplicate" : "Different",
          }))
        : [];

      setAnalysis({
        documentCount: Number(data.documentCount),
        threshold: Number(data.threshold),
        shingleSize: Number(data.shingleSize),
        algorithm: data.algorithm,
        nearDuplicateCount: Number(data.nearDuplicateCount),
        message: data.message,
        results: resultsData,
      });
      setActivePage("results");
    } catch (error) {
      if (requestId !== analysisRequestId.current || error.name === "AbortError") {
        return;
      }

      setErrorMessage(
        error.message || "Something went wrong while analyzing the documents."
      );
      setAnalysis(null);
    } finally {
      if (requestId === analysisRequestId.current) {
        activeAnalysisController.current = null;
        setIsRunning(false);
      }
    }
  };

  const Dashboard = () => (
    <>
      <section className="hero-section">
        <div>
          <span className="hero-badge">DSA • DOCUMENT ANALYSIS</span>
          <h2>
            Detect documents that are <span>almost the same.</span>
          </h2>
          <p>
            Analyze multiple documents using shingling, document similarity, and threshold-based
            classification to identify near-duplicate content.
          </p>
          <button className="primary-button" onClick={runDetection} disabled={isRunning}>
            {isRunning ? (
              <>
                <span className="spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                Run Detection <span>→</span>
              </>
            )}
          </button>
        </div>

        <div className="hero-visual">
          <div className="visual-circle circle-one"></div>
          <div className="visual-circle circle-two"></div>
          <div className="algorithm-card">
            <div className="algorithm-icon">Σ</div>
            <div>
              <strong>Jaccard Similarity</strong>
              <span>Current Analysis Engine</span>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard title="Documents" value={statistics.documents} icon="▤" description="Current documents" />
        <StatCard title="Comparisons" value={statistics.pairs} icon="⇄" description="Possible pairs" />
        <StatCard title="Near Duplicates" value={statistics.nearDuplicates} icon="◎" description="Detected matches" />
        <StatCard title="Threshold" value={statistics.threshold} icon="⌁" description="Next analysis setting" />
      </section>

      <div className="dashboard-grid">
        <DocumentUpload
          documents={documents}
          onFiles={handleFiles}
          onRemove={removeDocument}
          onAddManualDocument={addManualDocument}
          onUpdateManualDocument={updateDocument}
          onClearAll={clearAllDocuments}
          documentMode={documentMode}
          setDocumentMode={setDocumentMode}
        />

        <Configuration
          config={config}
          setConfig={setConfig}
          analysis={analysis}
          isRunning={isRunning}
          onSettingsChange={clearAnalysis}
        />
      </div>

      {Pipeline()}
    </>
  );

  const DocumentsPage = () => (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="section-label">DOCUMENT MANAGEMENT</p>
          <h2>Documents</h2>
          <p>Upload files or enter text manually for the documents you want to compare.</p>
        </div>
      </div>

      <DocumentUpload
        documents={documents}
        onFiles={handleFiles}
        onRemove={removeDocument}
        onAddManualDocument={addManualDocument}
        onUpdateManualDocument={updateDocument}
        onClearAll={clearAllDocuments}
        documentMode={documentMode}
        setDocumentMode={setDocumentMode}
      />
    </section>
  );

  const ResultsPage = () => (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="section-label">ANALYSIS OUTPUT</p>
          <h2>Detection Results</h2>
          <p>Similarity comparisons generated for the current document selections only.</p>
        </div>

        {analysis && <div className="analysis-badge">Analysis Complete</div>}
      </div>

      {!analysis || analysis.results.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◎</div>
          <h3>No analysis available</h3>
          <p>
            Upload or enter at least two documents and run the detection process using the current
            threshold.
          </p>
        </div>
      ) : (
        <ResultsTable results={analysis.results} threshold={analysis.threshold} />
      )}
    </section>
  );

  const PipelinePage = () => (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="section-label">ALGORITHM</p>
          <h2>Detection Pipeline</h2>
          <p>Processing stages used by the detection framework.</p>
        </div>
      </div>

      {Pipeline()}
    </section>
  );

  const Pipeline = () => {
    const steps = [
      { number: "01", title: "Preprocessing", icon: "Aa", description: "Normalize document text before comparison." },
      { number: "02", title: "Shingling", icon: "▦", description: "Convert text into overlapping word shingles." },
      { number: "03", title: "Jaccard Similarity", icon: "≈", description: "Compare the shingle sets for each document pair." },
      { number: "04", title: "Classification", icon: "✓", description: "Compare each similarity score with the selected threshold." },
    ];

    return (
      <section className="pipeline-section">
        <div className="section-header">
          <div>
            <p className="section-label">ALGORITHM</p>
            <h2>Detection Pipeline</h2>
          </div>
        </div>

        <div className="pipeline">
          {steps.map((step, index) => (
            <div key={step.number} style={{ display: "contents" }}>
              <div className="pipeline-step">
                <span className="step-number">{step.number}</span>
                <div className="step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>

              {index < steps.length - 1 && <div className="pipeline-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderPage = () => {
    switch (activePage) {
      case "documents":
        return DocumentsPage();
      case "results":
        return ResultsPage();
      case "pipeline":
        return PipelinePage();
      default:
        return Dashboard();
    }
  };

  return (
    <div className="app">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="topbar-label">DOCUMENT INTELLIGENCE</p>
            <h1>Near-Duplicate Document Detection Framework</h1>
          </div>

          <div className="system-status">
            <span className="status-dot"></span>
            System Ready
          </div>
        </header>

        {errorMessage && <div className="error-banner" role="alert">{errorMessage}</div>}

        {renderPage()}
      </main>
    </div>
  );
}

export default App;