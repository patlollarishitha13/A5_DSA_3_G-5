function Configuration({
  config,
  setConfig,
  analysis,
  isRunning,
  onSettingsChange,
}) {
  const updateConfig = (key, value) => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return;
    }

    setConfig((previous) => ({
      ...previous,
      [key]: Number.isFinite(numericValue) ? numericValue : previous[key],
    }));
    onSettingsChange();
  };

  const handleThresholdChange = (rawValue) => {
    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) {
      return;
    }

    const clampedValue = Math.min(100, Math.max(0, numericValue));
    updateConfig("threshold", clampedValue);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">PARAMETERS</p>
          <h2>Detection Configuration</h2>
          <p className="configuration-caption">Settings for the next analysis</p>
        </div>
      </div>

      <div className="config-list">
        <p className="configuration-note">
          These are editable settings for the next run. The current backend uses shingle size and
          threshold; MinHash and LSH controls are reserved and are not part of its Jaccard analysis.
        </p>

        <ConfigSlider
          label="Shingle Size"
          description="Number of consecutive words"
          value={config.shingleSize}
          min={2}
          max={6}
          suffix=" words"
          displayValue={`${config.shingleSize} words`}
          onChange={(value) => updateConfig("shingleSize", value)}
        />

        <ConfigSlider
          label="MinHash Functions"
          description="Not used by the current Jaccard analysis"
          value={config.minHashFunctions}
          min={20}
          max={200}
          step={10}
          suffix=""
          disabled
          displayValue="Not used"
        />

        <ConfigSlider
          label="LSH Bands"
          description="Not used by the current Jaccard analysis"
          value={config.bands}
          min={5}
          max={50}
          suffix=""
          disabled
          displayValue="Not used"
        />

        <ConfigSlider
          label="Rows per Band"
          description="Not used by the current Jaccard analysis"
          value={config.rows}
          min={1}
          max={10}
          suffix=""
          disabled
          displayValue="Not used"
        />

        <div className="config-item threshold-control">
          <div className="config-heading">
            <div>
              <strong>Similarity Threshold</strong>
              <span>Classification threshold for near duplicates</span>
            </div>
            <div className="config-value threshold-value">{config.threshold}%</div>
          </div>

          <div className="threshold-input-row">
            <input
              className="range-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={config.threshold}
              onChange={(event) => handleThresholdChange(event.target.value)}
            />

            <label className="numeric-threshold-wrapper">
              <span>Current threshold</span>
              <input
                type="number"
                min={0}
                max={100}
                value={config.threshold}
                onChange={(event) => handleThresholdChange(event.target.value)}
              />
            </label>
          </div>

          <div className="range-labels">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className="configuration-summary analysis-configuration">
        <div>
          <span>Analysis status</span>
          <strong>
            {isRunning
              ? "Analysis in progress"
              : analysis
                ? `Analysis completed · ${analysis.documentCount} documents analyzed`
                : "No documents analyzed yet"}
          </strong>
        </div>
        <div>
          <span>Shingle size used</span>
          <strong>{analysis ? `${analysis.shingleSize} words` : "—"}</strong>
        </div>
        <div>
          <span>MinHash functions</span>
          <strong>{analysis ? "Not used" : "—"}</strong>
        </div>
        <div>
          <span>LSH bands / rows per band</span>
          <strong>{analysis ? "Not used" : "—"}</strong>
        </div>
        <div>
          <span>Threshold used</span>
          <strong>{analysis ? `${analysis.threshold}%` : "—"}</strong>
        </div>
        <div>
          <span>Pipeline used</span>
          <strong>{analysis ? analysis.algorithm : "—"}</strong>
        </div>
        <div>
          <span>Classification</span>
          <strong>
            {analysis ? `≥ ${analysis.threshold}% = Near Duplicate` : "—"}
          </strong>
        </div>
      </div>
    </div>
  );
}

function ConfigSlider({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  suffix,
  disabled = false,
  displayValue,
  onChange,
}) {
  return (
    <div className="config-item">
      <div className="config-heading">
        <div>
          <strong>{label}</strong>
          <span>{description}</span>
        </div>

        <div className={`config-value${disabled ? " config-value-disabled" : ""}`}>
          {displayValue ?? `${value}${suffix}`}
        </div>
      </div>

      <input
        className="range-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />

      <div className="range-labels">
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

export default Configuration;