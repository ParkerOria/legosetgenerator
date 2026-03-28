import { useState, useRef, useEffect } from 'react'
import './App.css'

const LOADING_MESSAGES = [
  'Fetching your brick inventory...',
  'Designing your build concept...',
  'Validating build steps...',
  'Rendering your build...',
]

const BUILD_COLOR = '#E3000B'

function App() {
  const [stage, setStage] = useState('input') // 'input' | 'loading' | 'results' | 'instructions'
  const [uploadedImage, setUploadedImage] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [editablePrompt, setEditablePrompt] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [setNumber, setSetNumber] = useState(null)
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [analyzeError, setAnalyzeError] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [generatedBuild, setGeneratedBuild] = useState(null)
  const [steps, setSteps] = useState([])
  const [revealedCount, setRevealedCount] = useState(0)
  const [stepsLoading, setStepsLoading] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [generateError, setGenerateError] = useState(false)
  const [stepImages, setStepImages] = useState({}) // { [stepIndex]: 'loading' | base64string | null }
  const fileInputRef = useRef(null)

  const totalSteps = revealedCount

  // Cycle loading messages while generating
  useEffect(() => {
    if (stage !== 'loading') return
    setLoadingMsgIndex(0)
    const interval = setInterval(() => {
      setLoadingMsgIndex(i => Math.min(i + 1, LOADING_MESSAGES.length - 1))
    }, 5000)
    return () => clearInterval(interval)
  }, [stage])

  // Reveal steps one at a time once they arrive
  useEffect(() => {
    if (revealedCount >= steps.length) return
    const t = setTimeout(() => setRevealedCount(c => c + 1), 180)
    return () => clearTimeout(t)
  }, [steps, revealedCount])

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

  const fetchSteps = async (ideas, summary) => {
    setStepsLoading(true)
    setSteps([])
    try {
      const res = await fetch('/api/generate-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideas, summary }),
      })
      if (!res.ok) throw new Error('Steps failed')
      const data = await res.json()
      setSteps(data.steps ?? [])
    } catch {
      setSteps([])
    } finally {
      setStepsLoading(false)
    }
  }

  const handleGenerate = async () => {
    setEditablePrompt(prompt)
    setGenerateError(false)
    setGeneratedBuild(null)
    setSteps([])
    setRevealedCount(0)
    setStepImages({})
    setStage('loading')
    try {
      const res = await fetch('/api/generate-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setNumber, prompt }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()
      setGeneratedBuild(data)
      setStage('results')
      fetchSteps(data.ideas, data.summary)
    } catch {
      setGenerateError(true)
      setStage('results')
    }
  }

  const handleRegenerate = async () => {
    setGenerateError(false)
    setGeneratedBuild(null)
    setSteps([])
    setRevealedCount(0)
    setStepImages({})
    setStage('loading')
    try {
      const res = await fetch('/api/generate-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setNumber, prompt: editablePrompt }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()
      setGeneratedBuild(data)
      setStage('results')
      fetchSteps(data.ideas, data.summary)
    } catch {
      setGenerateError(true)
      setStage('results')
    }
  }

  const fetchStepImage = async (stepIndex) => {
    if (!generatedBuild) return
    if (stepImages[stepIndex] !== undefined) return // already loaded or loading
    const step = steps[stepIndex]
    if (!step) return
    setStepImages(prev => ({ ...prev, [stepIndex]: 'loading' }))
    try {
      const res = await fetch('/api/generate-step-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNum: step.step ?? stepIndex + 1,
          title: step.title ?? '',
          description: step.description ?? '',
          summary: generatedBuild.summary ?? '',
          overviewImageBase64: generatedBuild.imageBase64 ?? null,
          prevImageBase64: stepIndex > 0 ? (stepImages[stepIndex - 1] || null) : null,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setStepImages(prev => ({ ...prev, [stepIndex]: data.imageBase64 ?? null }))
    } catch {
      setStepImages(prev => ({ ...prev, [stepIndex]: null }))
    }
  }

  const handleChooseBuild = () => {
    setCurrentStep(1)
    setStage('instructions')
  }

  const goToStep = (step) => {
    if (step < 1 || step > totalSteps) return
    setCurrentStep(step)
  }

  const canGenerate = uploadedImage && prompt.trim() && setNumber

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
          <li><a href="#">Home</a></li>
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
                      <button className="scan-btn" onClick={(e) => { e.stopPropagation(); analyzeImage(uploadedFile) }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                        Find Set ID
                      </button>
                    )}
                    {analyzingImage && (
                      <div className="set-badge scanning"><div className="scan-spinner" />Scanning...</div>
                    )}
                    {!analyzingImage && setNumber && (
                      <div className="set-badge found">Set #{setNumber}</div>
                    )}
                    {!analyzingImage && analyzeError && (
                      <div className="set-badge error">
                        ID not found —
                        <button className="retry-link" onClick={(e) => { e.stopPropagation(); analyzeImage(uploadedFile) }}>retry</button>
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
                Upload your LEGO set box, describe your idea, and we'll generate a custom build plan using your exact bricks.
              </p>
              <textarea
                className="prompt-input"
                placeholder="e.g. a medieval castle with a drawbridge..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
              />
              <button className="generate-btn" disabled={!canGenerate} onClick={handleGenerate}>
                Generate Build
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              {uploadedImage && !setNumber && (
                <p className="generate-hint">Find your Set ID above before generating</p>
              )}
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
                {setNumber && <div className="context-set-badge">Set #{setNumber}</div>}
              </div>
              <button className="start-over-btn" onClick={() => setStage('input')}>← Start over</button>
            </div>

            <div className="results-header">
              <h2 className="results-title">
                {stage === 'loading' ? LOADING_MESSAGES[loadingMsgIndex] : (generateError ? 'Something went wrong' : 'Your Build')}
              </h2>
              {stage === 'results' && !generateError && (
                <p className="results-sub">Like what you see? Choose it to get your step-by-step guide.</p>
              )}
            </div>

            <div className="builds-grid single">
              {stage === 'loading' ? (
                <div className="build-card skeleton">
                  <div className="skeleton-img"></div>
                  <div className="skeleton-body">
                    <div className="skeleton-line wide"></div>
                    <div className="skeleton-line"></div>
                    <div className="skeleton-line short"></div>
                    <div className="skeleton-btn"></div>
                  </div>
                </div>
              ) : generateError ? (
                <div className="generate-error-card">
                  <p>The build could not be generated. This might be because the set parts aren't compatible with your prompt.</p>
                  <p>Try editing your prompt below and regenerating.</p>
                </div>
              ) : generatedBuild && (
                <div className="build-card">
                  <div className="build-img-area generated">
                    {generatedBuild.imageBase64 ? (
                      <img
                        src={`data:image/png;base64,${generatedBuild.imageBase64}`}
                        alt={generatedBuild.title}
                        className="build-generated-img"
                      />
                    ) : (
                      <>
                        <div className="build-img-studs" />
                        <div className="build-card-brick">
                          <div className="bc-stud"></div><div className="bc-stud"></div>
                          <div className="bc-stud"></div><div className="bc-stud"></div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="build-body">
                    <h3 className="build-title">{generatedBuild.title}</h3>
                    <p className="build-desc">{generatedBuild.description}</p>
                    <div className="build-steps-preview">
                      {stepsLoading && revealedCount === 0 ? (
                        <><div className="scan-spinner" />Generating steps…</>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                          </svg>
                          {revealedCount} of {stepsLoading ? '?' : steps.length} steps ready
                        </>
                      )}
                    </div>
                    <button className="choose-btn" onClick={handleChooseBuild} disabled={revealedCount === 0}>
                      Start building
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
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
      {stage === 'instructions' && generatedBuild && (
        <section className="instructions-section">
          <div className="instructions-inner">

            <div className="instr-topbar">
              <button className="back-btn" onClick={() => setStage('results')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to build
              </button>
              <div className="instr-build-info">
                <div className="instr-color-dot" style={{ background: BUILD_COLOR }} />
                <span className="instr-build-name">{generatedBuild.title}</span>
              </div>
              <span className="instr-step-counter">
                Step <strong>{currentStep}</strong> of {totalSteps}
              </span>
            </div>

            <div className="booklet-wrap">
              <button className="nav-arrow" onClick={() => goToStep(currentStep - 1)} disabled={currentStep === 1} aria-label="Previous step">
                &#8249;
              </button>

              <div className="booklet">
                <div className="booklet-spine" style={{ background: BUILD_COLOR }}>
                  <span className="spine-text">BRICKGEN</span>
                </div>
                <div className="booklet-page">
                  <div className="page-progress-track">
                    <div className="page-progress-fill" style={{ width: `${(currentStep / totalSteps) * 100}%`, background: BUILD_COLOR }} />
                  </div>

                  <div key={currentStep} className="booklet-content">
                    <div className="step-header-row">
                      <div className="step-badge" style={{ background: BUILD_COLOR }}>
                        {currentStep === totalSteps
                          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          : currentStep
                        }
                      </div>
                      <span className="step-title-text">{steps[currentStep - 1]?.title ?? ''}</span>
                    </div>

                    {stepImages[currentStep - 1] === 'loading' ? (
                      <>
                        <div className="step-img-skeleton" />
                        <div className="step-desc-below">{steps[currentStep - 1]?.description ?? ''}</div>
                      </>
                    ) : stepImages[currentStep - 1] ? (
                      <>
                        <div className="step-image-area" style={{ background: '#f8f8f8' }}>
                          <img
                            src={`data:image/png;base64,${stepImages[currentStep - 1]}`}
                            alt={`Step ${currentStep}`}
                            className="step-preview-img"
                          />
                        </div>
                        <div className="step-desc-below">{steps[currentStep - 1]?.description ?? ''}</div>
                      </>
                    ) : (
                      <div className="step-text-area">
                        <p className="step-desc-main">{steps[currentStep - 1]?.description ?? ''}</p>
                        <button className="gen-img-btn" onClick={() => fetchStepImage(currentStep - 1)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                          </svg>
                          Generate image
                        </button>
                      </div>
                    )}

                    {currentStep === totalSteps && (
                      <div className="completion-banner">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        Build Complete!
                      </div>
                    )}

                    <div className="page-footer">
                      <span className="page-num">{currentStep} / {totalSteps}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button className="nav-arrow" onClick={() => goToStep(currentStep + 1)} disabled={currentStep >= revealedCount || stepImages[currentStep - 1] === 'loading'} aria-label="Next step">
                &#8250;
              </button>
            </div>

            <div className="step-dots-wrap">
              <div className="step-dots">
                {steps.map((step, i) => (
                  <button
                    key={i}
                    className={`step-dot${i + 1 === currentStep ? ' active' : ''}${i + 1 < currentStep ? ' done' : ''}`}
                    onClick={() => goToStep(i + 1)}
                    title={`Step ${i + 1}: ${step.title}`}
                    style={
                      i + 1 === currentStep
                        ? { background: BUILD_COLOR, borderColor: BUILD_COLOR }
                        : i + 1 < currentStep
                        ? { background: BUILD_COLOR + '55', borderColor: BUILD_COLOR + '99' }
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
