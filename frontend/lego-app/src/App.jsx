import { useState, useRef } from 'react'
import './App.css'

const MOCK_BUILDS = [
  { id: 1, title: 'Medieval Castle',  description: 'A towering fortress with drawbridge, battlements, and two guard towers.', color: '#E3000B' },
  { id: 2, title: 'Racing Car',       description: 'A sleek low-profile sports car with rear spoiler and aerodynamic side panels.', color: '#006CB7' },
  { id: 3, title: 'Jungle Temple',    description: 'An ancient stone temple overgrown with vines and hidden trap chambers.', color: '#00A850' },
  { id: 4, title: 'City Bridge',      description: 'A suspension bridge with twin support towers, cable stays, and a wide roadway.', color: '#FF6B00' },
]

const MOCK_STEPS = [
  { id: 1,  title: 'Sort Your Pieces', parts: [] },
  { id: 2,  title: 'Build the Base',   parts: [{ n: 2, label: '4×8', color: '#888' }, { n: 1, label: '6×6', color: '#888' }] },
  { id: 3,  title: 'First Wall Layer', parts: [{ n: 8, label: '2×4', color: '#c0392b' }, { n: 4, label: '1×4', color: '#c0392b' }] },
  { id: 4,  title: 'Left Tower',       parts: [{ n: 6, label: '2×4', color: '#c0392b' }, { n: 2, label: '2×2', color: '#c0392b' }] },
  { id: 5,  title: 'Right Tower',      parts: [{ n: 6, label: '2×4', color: '#c0392b' }, { n: 2, label: '2×2', color: '#c0392b' }] },
  { id: 6,  title: 'Gate Archway',     parts: [{ n: 4, label: '1×2', color: '#888' }, { n: 2, label: 'arch', color: '#888' }] },
  { id: 7,  title: 'Drawbridge',       parts: [{ n: 2, label: '2×6', color: '#8B6914' }, { n: 4, label: '1×1', color: '#888' }] },
  { id: 8,  title: 'Battlements',      parts: [{ n: 16, label: '1×1', color: '#c0392b' }, { n: 8, label: '1×2', color: '#c0392b' }] },
  { id: 9,  title: 'Tower Roofs',      parts: [{ n: 8, label: 'slope', color: '#006CB7' }, { n: 4, label: '1×2', color: '#006CB7' }] },
  { id: 10, title: 'Flags & Details',  parts: [{ n: 2, label: 'flag', color: '#FFD700' }, { n: 2, label: 'pole', color: '#888' }] },
  { id: 11, title: 'Interior Details', parts: [{ n: 1, label: 'chair', color: '#8B6914' }, { n: 3, label: '1×1', color: '#FFD700' }] },
  { id: 12, title: 'All Done!',        parts: [] },
]

function App() {
  const [stage, setStage] = useState('input') // 'input' | 'loading' | 'results' | 'instructions'
  const [uploadedImage, setUploadedImage] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [editablePrompt, setEditablePrompt] = useState('')
  const [selectedBuild, setSelectedBuild] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [setNumber, setSetNumber] = useState(null)
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [analyzeError, setAnalyzeError] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const fileInputRef = useRef(null)

  const totalSteps = MOCK_STEPS.length

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  const analyzeImage = async (file) => {
    setAnalyzingImage(true)
    setAnalyzeError(false)
    setSetNumber(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/analyze-set', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setSetNumber(data.setNumber === 'unknown' ? null : data.setNumber)
      if (data.setNumber === 'unknown') setAnalyzeError(true)
    } catch {
      setAnalyzeError(true)
    } finally {
      setAnalyzingImage(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setUploadedImage(URL.createObjectURL(file))
      setUploadedFile(file)
      setSetNumber(null)
      setAnalyzeError(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadedImage(URL.createObjectURL(file))
      setUploadedFile(file)
      setSetNumber(null)
      setAnalyzeError(false)
    }
  }

  const handleRemoveImage = (e) => {
    e.stopPropagation()
    setUploadedImage(null)
    setUploadedFile(null)
    setSetNumber(null)
    setAnalyzingImage(false)
    setAnalyzeError(false)
    fileInputRef.current.value = ''
  }

  const handleGenerate = () => {
    setEditablePrompt(prompt)
    setStage('loading')
    setTimeout(() => setStage('results'), 2200)
  }

  const handleRegenerate = () => {
    setStage('loading')
    setTimeout(() => setStage('results'), 2200)
  }

  const handleChooseBuild = (build) => {
    setSelectedBuild(build)
    setCurrentStep(1)
    setStage('instructions')
  }

  const goToStep = (step) => {
    if (step < 1 || step > totalSteps) return
    setCurrentStep(step)
  }

  return (
    <>
      {/* ── Navbar ─────────────────────────────────────── */}
      <nav className="navbar">
        <div className="nav-logo">
          <div className="logo-brick">
            <div className="logo-stud"></div>
            <div className="logo-stud"></div>
          </div>
          <span>BrickGen</span>
        </div>
        <ul className="nav-links">
          <li><a href="#">How it works</a></li>
          <li><a href="#">Gallery</a></li>
          <li><a href="#">About</a></li>
        </ul>
      </nav>

      {/* ── Input Stage ────────────────────────────────── */}
      {stage === 'input' && (
        <section className="hero">
          <div className="hero-inner">
            <div
              className={`upload-panel${isDragging ? ' dragging' : ''}${uploadedImage ? ' has-image' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploadedImage && fileInputRef.current.click()}
            >
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} hidden />
              {uploadedImage ? (
                <div className="upload-preview-wrap">
                  <img src={uploadedImage} alt="Uploaded LEGO set" className="upload-preview" />

                  <div className="scan-row">
                    {!setNumber && !analyzingImage && (
                      <button
                        className="scan-btn"
                        onClick={(e) => { e.stopPropagation(); analyzeImage(uploadedFile) }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                        Find Set ID
                      </button>
                    )}

                    {analyzingImage && (
                      <div className="set-badge scanning">
                        <div className="scan-spinner" />
                        Scanning...
                      </div>
                    )}

                    {!analyzingImage && setNumber && (
                      <div className="set-badge found">
                        Set #{setNumber}
                      </div>
                    )}

                    {!analyzingImage && analyzeError && (
                      <div className="set-badge error">
                        ID not found —
                        <button
                          className="retry-link"
                          onClick={(e) => { e.stopPropagation(); analyzeImage(uploadedFile) }}
                        >
                          retry
                        </button>
                      </div>
                    )}

                    <button className="remove-btn" onClick={handleRemoveImage}>Remove</button>
                  </div>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="brick-icon">
                    <div className="brick-stud"></div>
                    <div className="brick-stud"></div>
                  </div>
                  <p className="upload-title">Drop your set box here</p>
                  <p className="upload-sub">or click to upload</p>
                  <span className="upload-hint">PNG · JPG · WEBP</span>
                </div>
              )}
            </div>

            <div className="hero-divider"><span>+</span></div>

            <div className="prompt-panel">
              <div className="prompt-tag">AI-powered</div>
              <h1 className="hero-title">
                What do you want<br />
                to <span className="title-accent">build?</span>
              </h1>
              <p className="hero-sub">
                Upload your LEGO set box, describe your idea, and we'll generate custom build plans using your exact bricks.
              </p>
              <textarea
                className="prompt-input"
                placeholder="e.g. a medieval castle with a drawbridge..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
              />
              <button
                className="generate-btn"
                disabled={!uploadedImage || !prompt.trim()}
                onClick={handleGenerate}
              >
                Generate Ideas
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Results Stage ──────────────────────────────── */}
      {(stage === 'loading' || stage === 'results') && (
        <section className="results-section">
          <div className="results-inner">
            <div className="results-context">
              <div className="context-left">
                {uploadedImage && <img src={uploadedImage} alt="Your set" className="context-thumb" />}
                <div className="context-text">
                  <span className="context-label">Results for</span>
                  <span className="context-prompt">"{editablePrompt}"</span>
                </div>
                {setNumber && (
                  <div className="context-set-badge">Set #{setNumber}</div>
                )}
              </div>
              <button className="start-over-btn" onClick={() => setStage('input')}>← Start over</button>
            </div>

            <div className="results-header">
              <h2 className="results-title">
                {stage === 'loading' ? 'Generating your builds...' : '4 Build Ideas'}
              </h2>
              {stage === 'results' && <p className="results-sub">Pick the one you like, or refine your prompt below.</p>}
            </div>

            <div className="builds-grid">
              {stage === 'loading'
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="build-card skeleton">
                      <div className="skeleton-img"></div>
                      <div className="skeleton-body">
                        <div className="skeleton-line wide"></div>
                        <div className="skeleton-line"></div>
                        <div className="skeleton-line short"></div>
                        <div className="skeleton-btn"></div>
                      </div>
                    </div>
                  ))
                : MOCK_BUILDS.map((build) => (
                    <div key={build.id} className="build-card">
                      <div className="build-img-area" style={{ background: build.color }}>
                        <div className="build-img-studs" />
                        <div className="build-card-brick">
                          <div className="bc-stud"></div>
                          <div className="bc-stud"></div>
                          <div className="bc-stud"></div>
                          <div className="bc-stud"></div>
                        </div>
                      </div>
                      <div className="build-body">
                        <h3 className="build-title">{build.title}</h3>
                        <p className="build-desc">{build.description}</p>
                        <button className="choose-btn" onClick={() => handleChooseBuild(build)}>
                          Choose this build
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
              }
            </div>

            {stage === 'results' && (
              <div className="regen-section">
                <div className="regen-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                  </svg>
                  Not what you're looking for? Edit your prompt and regenerate.
                </div>
                <div className="regen-bar">
                  <textarea className="regen-input" value={editablePrompt} onChange={(e) => setEditablePrompt(e.target.value)} rows={2} />
                  <button className="regen-btn" onClick={handleRegenerate} disabled={!editablePrompt.trim()}>
                    Regenerate
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Instructions Stage ─────────────────────────── */}
      {stage === 'instructions' && selectedBuild && (
        <section className="instructions-section">
          <div className="instructions-inner">

            {/* Top bar */}
            <div className="instr-topbar">
              <button className="back-btn" onClick={() => setStage('results')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to builds
              </button>
              <div className="instr-build-info">
                <div className="instr-color-dot" style={{ background: selectedBuild.color }} />
                <span className="instr-build-name">{selectedBuild.title}</span>
              </div>
              <span className="instr-step-counter">
                Step <strong>{currentStep}</strong> of {totalSteps}
              </span>
            </div>

            {/* Booklet + side arrows */}
            <div className="booklet-wrap">
              <button
                className="nav-arrow"
                onClick={() => goToStep(currentStep - 1)}
                disabled={currentStep === 1}
                aria-label="Previous step"
              >
                &#8249;
              </button>

              <div className="booklet">
                {/* Spine */}
                <div className="booklet-spine" style={{ background: selectedBuild.color }}>
                  <span className="spine-text">BRICKGEN</span>
                </div>

                {/* Page */}
                <div className="booklet-page">
                  {/* Progress bar along top of page */}
                  <div className="page-progress-track">
                    <div
                      className="page-progress-fill"
                      style={{
                        width: `${(currentStep / totalSteps) * 100}%`,
                        background: selectedBuild.color,
                      }}
                    />
                  </div>

                  {/* Animated page content */}
                  <div key={currentStep} className="booklet-content">
                    <div className="step-header-row">
                      {/* Step number badge */}
                      <div className="step-badge" style={{ background: selectedBuild.color }}>
                        {currentStep === totalSteps
                          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          : currentStep
                        }
                      </div>
                      <span className="step-title-text">{MOCK_STEPS[currentStep - 1].title}</span>
                    </div>

                    {/* Parts needed */}
                    {MOCK_STEPS[currentStep - 1].parts.length > 0 && (
                      <div className="step-parts-row">
                        <span className="parts-label">You'll need:</span>
                        <div className="parts-list">
                          {MOCK_STEPS[currentStep - 1].parts.map((p, i) => (
                            <div key={i} className="part-chip">
                              <div className="part-brick" style={{ background: p.color }} />
                              <span>{p.n}× {p.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step illustration placeholder */}
                    <div
                      className={`step-image-area${currentStep === totalSteps ? ' final-step' : ''}`}
                      style={{ background: currentStep === totalSteps ? '#1a1a1a' : selectedBuild.color }}
                    >
                      <div className="step-img-studs" />
                      {currentStep === totalSteps ? (
                        <div className="completion-badge">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          <span>Build Complete!</span>
                        </div>
                      ) : (
                        <div className="step-img-brick">
                          <div className="sib-stud"></div>
                          <div className="sib-stud"></div>
                          <div className="sib-stud"></div>
                          <div className="sib-stud"></div>
                        </div>
                      )}
                    </div>

                    {/* Page footer */}
                    <div className="page-footer">
                      <span className="page-num">{currentStep} / {totalSteps}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="nav-arrow"
                onClick={() => goToStep(currentStep + 1)}
                disabled={currentStep === totalSteps}
                aria-label="Next step"
              >
                &#8250;
              </button>
            </div>

            {/* Step progress dots */}
            <div className="step-dots-wrap">
              <div className="step-dots">
                {MOCK_STEPS.map((step, i) => (
                  <button
                    key={step.id}
                    className={`step-dot${i + 1 === currentStep ? ' active' : ''}${i + 1 < currentStep ? ' done' : ''}`}
                    onClick={() => goToStep(i + 1)}
                    title={`Step ${i + 1}: ${step.title}`}
                    style={
                      i + 1 === currentStep
                        ? { background: selectedBuild.color, borderColor: selectedBuild.color }
                        : i + 1 < currentStep
                        ? { background: selectedBuild.color + '55', borderColor: selectedBuild.color + '99' }
                        : {}
                    }
                  />
                ))}
              </div>
              <span className="dots-hint">{currentStep < totalSteps ? 'Click any dot to jump to a step' : 'Build complete!'}</span>
            </div>

          </div>
        </section>
      )}
    </>
  )
}

export default App
