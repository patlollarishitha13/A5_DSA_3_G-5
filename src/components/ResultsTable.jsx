function ResultsTable({ results, threshold }) {
  const nearDuplicates = results.filter((item) => item.status === "Near Duplicate").length;

  return (
    <div className="results-container">
      <div className="results-summary">
        <div>
          <span>Document Count</span>
          <strong>{new Set(results.flatMap((item) => [item.documentA, item.documentB])).size}</strong>
        </div>

        <div>
          <span>Threshold</span>
          <strong>{threshold}%</strong>
        </div>

        <div>
          <span>Near Duplicates</span>
          <strong>{nearDuplicates}</strong>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Document A</th>
              <th>Document B</th>
              <th>Similarity</th>
              <th>Threshold</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {results.map((result, index) => (
              <tr key={result.id}>
                <td className="row-number">{String(index + 1).padStart(2, "0")}</td>
                <td>
                  <span className="table-file">{result.documentA}</span>
                </td>
                <td>
                  <span className="table-file">{result.documentB}</span>
                </td>
                <td>
                  <div className="similarity-cell">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, result.similarity || 0))}%`,
                        }}
                      ></div>
                    </div>
                    <span>{Number(result.similarity || 0).toFixed(2)}%</span>
                  </div>
                </td>
                <td>
                  <strong>{Number(threshold || 0).toFixed(0)}%</strong>
                </td>
                <td>
                  <span
                    className={`result-status ${result.status === "Near Duplicate" ? "duplicate" : "different"}`}
                  >
                    <span></span>
                    {result.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResultsTable;