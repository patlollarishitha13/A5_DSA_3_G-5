import { useRef } from "react";

function DocumentUpload({
  documents,
  onFiles,
  onRemove,
  onAddManualDocument,
  onUpdateManualDocument,
  onClearAll,
  documentMode,
  setDocumentMode,
}) {
  const inputRef = useRef(null);

  const handleSelect = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      onFiles(event.target.files);
    }

    event.target.value = "";
  };

  const manualDocuments = documents.filter((document) => document.source === "manual");

  const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return "No size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">INPUT</p>
          <h2>Document Collection</h2>
        </div>

        <span className="document-count">{documents.length} docs</span>
      </div>

      <div className="mode-toggle">
        <button
          type="button"
          className={documentMode === "upload" ? "mode-switch active" : "mode-switch"}
          onClick={() => setDocumentMode("upload")}
        >
          Upload Documents
        </button>
        <button
          type="button"
          className={documentMode === "manual" ? "mode-switch active" : "mode-switch"}
          onClick={() => setDocumentMode("manual")}
        >
          Enter Text Manually
        </button>
      </div>

      {documentMode === "upload" && (
        <div className="upload-area" onClick={() => inputRef.current?.click()}>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.rtf,.md,.pdf,text/plain,application/pdf"
            multiple
            onChange={handleSelect}
            hidden
          />

          <div className="upload-icon">↑</div>
          <h3>Upload documents</h3>
          <p>Click here to select one or more files</p>
          <span className="upload-format">TXT • RTF • MD • PDF • Multiple files supported</span>
        </div>
      )}

      {documentMode === "manual" && (
        <div className="manual-documents">
          {manualDocuments.length === 0 && (
            <div className="empty-manual-docs">No manual documents yet. Add your first document.</div>
          )}

          {manualDocuments.map((document) => (
            <div className="manual-doc-item" key={document.id}>
              <div className="manual-doc-header">
                <label>
                  <span>Document name</span>
                  <input
                    type="text"
                    value={document.name}
                    onChange={(event) =>
                      onUpdateManualDocument(document.id, {
                        name: event.target.value,
                      })
                    }
                  />
                </label>

                <button type="button" className="remove-button" onClick={() => onRemove(document.id)}>
                  ×
                </button>
              </div>

              <label>
                <span>Document text</span>
                <textarea
                  rows={7}
                  value={document.text}
                  onChange={(event) =>
                    onUpdateManualDocument(document.id, {
                      text: event.target.value,
                    })
                  }
                  placeholder="Paste or type the document text here..."
                />
              </label>
            </div>
          ))}

          <button type="button" className="add-document-button" onClick={onAddManualDocument}>
            + Add another document
          </button>
        </div>
      )}

      {documents.length > 0 && (
        <div className="document-list">
          {documents.map((document) => (
            <div className="document-item" key={document.id}>
              <div className="file-icon">{document.source === "manual" ? "TXT" : "FILE"}</div>

              <div className="document-info">
                <strong>{document.name || "Untitled Document"}</strong>
                <span>{document.source === "manual" ? "Manual entry" : formatSize(document.size)}</span>
              </div>

              <button type="button" className="remove-button" onClick={() => onRemove(document.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <button type="button" className="clear-action-button" onClick={onClearAll}>
          Clear all documents
        </button>
      )}

      {documents.length === 0 && (
        <div className="no-documents">No documents selected yet. Choose a method above to get started.</div>
      )}
    </div>
  );
}

export default DocumentUpload;