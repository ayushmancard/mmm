import { useMemo, useRef, useState } from 'react'
import './App.css'
import { enhanceVideo, type EnhanceOptions } from './lib/ffmpeg'

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [options, setOptions] = useState<EnhanceOptions>({
    brightness: 0,
    contrast: 1,
    saturation: 1,
    sharpen: 0,
    scalePercent: 100,
    fps: 0,
    denoiseStrength: 0,
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [outputURL, setOutputURL] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const canEnhance = useMemo(() => !!selectedFile && !isProcessing, [selectedFile, isProcessing])

  function resetOutput() {
    if (outputURL) URL.revokeObjectURL(outputURL)
    setOutputURL(null)
  }

  async function handleEnhance() {
    if (!selectedFile) return
    setIsProcessing(true)
    setError(null)
    setProgress(0)
    resetOutput()
    try {
      const { blob } = await enhanceVideo(selectedFile, options, (r) => setProgress(Math.max(0, Math.min(1, r))))
      const url = URL.createObjectURL(blob)
      setOutputURL(url)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      setError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>Video Enhancer</h1>
        <p>Enhance brightness, contrast, saturation, sharpness, scale, FPS, and denoise in your browser.</p>
      </header>

      <section className="upload">
        <input
          type="file"
          accept="video/*"
          onChange={(e) => {
            const f = e.target.files?.[0] || null
            setSelectedFile(f)
            resetOutput()
            if (videoRef.current) {
              videoRef.current.src = f ? URL.createObjectURL(f) : ''
              videoRef.current.load()
            }
          }}
        />
      </section>

      <section className="preview">
        <div className="video-wrap">
          <video ref={videoRef} controls playsInline />
        </div>
      </section>

      <section className="controls">
        <div className="control">
          <label>Brightness: {options.brightness.toFixed(2)}</label>
          <input type="range" min={-1} max={1} step={0.01}
                 value={options.brightness}
                 onChange={(e) => setOptions({ ...options, brightness: Number(e.target.value) })} />
        </div>
        <div className="control">
          <label>Contrast: {options.contrast.toFixed(2)}</label>
          <input type="range" min={0} max={3} step={0.01}
                 value={options.contrast}
                 onChange={(e) => setOptions({ ...options, contrast: Number(e.target.value) })} />
        </div>
        <div className="control">
          <label>Saturation: {options.saturation.toFixed(2)}</label>
          <input type="range" min={0} max={3} step={0.01}
                 value={options.saturation}
                 onChange={(e) => setOptions({ ...options, saturation: Number(e.target.value) })} />
        </div>
        <div className="control">
          <label>Sharpen: {options.sharpen.toFixed(2)}</label>
          <input type="range" min={0} max={3} step={0.01}
                 value={options.sharpen}
                 onChange={(e) => setOptions({ ...options, sharpen: Number(e.target.value) })} />
        </div>
        <div className="control">
          <label>Scale: {options.scalePercent}%</label>
          <input type="range" min={25} max={200} step={1}
                 value={options.scalePercent}
                 onChange={(e) => setOptions({ ...options, scalePercent: Number(e.target.value) })} />
        </div>
        <div className="control">
          <label>FPS (0=keep): {options.fps}</label>
          <input type="range" min={0} max={60} step={1}
                 value={options.fps || 0}
                 onChange={(e) => setOptions({ ...options, fps: Number(e.target.value) })} />
        </div>
        <div className="control">
          <label>Denoise: {options.denoiseStrength?.toFixed(2)}</label>
          <input type="range" min={0} max={3} step={0.01}
                 value={options.denoiseStrength || 0}
                 onChange={(e) => setOptions({ ...options, denoiseStrength: Number(e.target.value) })} />
        </div>
      </section>

      <section className="actions">
        <button disabled={!canEnhance} onClick={handleEnhance}>
          {isProcessing ? 'Processing…' : 'Enhance'}
        </button>
        {isProcessing && (
          <div className="progress">
            <div className="bar" style={{ width: `${Math.round(progress * 100)}%` }} />
            <span>{Math.round(progress * 100)}%</span>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="output">
        {outputURL && (
          <div className="video-wrap">
            <video src={outputURL} controls playsInline />
            <a className="download" href={outputURL} download={`enhanced-${selectedFile?.name || 'video'}.mp4`}>
              Download MP4
            </a>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
