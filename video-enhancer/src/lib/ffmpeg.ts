import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

export type EnhanceOptions = {
  brightness: number
  contrast: number
  saturation: number
  sharpen: number
  scalePercent: number
  fps?: number
  denoiseStrength?: number
}

let ffmpegInstance: FFmpeg | null = null

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance

  const ffmpeg = new FFmpeg()
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
  })

  ffmpegInstance = ffmpeg
  return ffmpegInstance
}

export async function enhanceVideo(
  file: File,
  options: EnhanceOptions,
  onProgress?: (ratio: number) => void,
): Promise<{ blob: Blob; outputName: string }>
{
  const ffmpeg = await getFFmpeg()

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(progress)
    })
  }

  const inputExt = (file.name.split('.').pop() || 'mp4').toLowerCase()
  const inputName = `input.${inputExt}`
  const outputName = `output.mp4`

  const fileData = new Uint8Array(await file.arrayBuffer())
  await ffmpeg.writeFile(inputName, fileData)

  const filters: string[] = []

  const eq = `eq=contrast=${Number(options.contrast).toFixed(2)}:brightness=${Number(options.brightness).toFixed(2)}:saturation=${Number(options.saturation).toFixed(2)}`
  filters.push(eq)

  if (options.sharpen > 0) {
    const amount = Number(options.sharpen).toFixed(2)
    filters.push(`unsharp=luma_msize_x=7:luma_msize_y=7:luma_amount=${amount}`)
  }

  if (options.scalePercent && options.scalePercent !== 100) {
    const factor = options.scalePercent / 100
    // Ensure even dimensions for most encoders
    filters.push(`scale=ceil(iw*${factor}/2)*2:ceil(ih*${factor}/2)*2:flags=lanczos`)
  }

  if (options.denoiseStrength && options.denoiseStrength > 0) {
    // hqdn3d: luma_spatial:chroma_spatial:luma_tmp:chroma_tmp
    const f = options.denoiseStrength
    const ls = (1.2 * f).toFixed(2)
    const cs = (1.0 * f).toFixed(2)
    const lt = (6.0 * f).toFixed(2)
    const ct = (6.0 * f).toFixed(2)
    filters.push(`hqdn3d=${ls}:${cs}:${lt}:${ct}`)
  }

  const vf = filters.join(',')

  const args: string[] = ['-i', inputName]

  if (vf.length > 0) {
    args.push('-vf', vf)
  }

  if (options.fps && options.fps > 0) {
    args.push('-r', String(options.fps))
  }

  // Attempt H.264 in MP4; if not supported by core, user will see error in UI.
  args.push(
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputName,
  )

  await ffmpeg.exec(args)

  const data = await ffmpeg.readFile(outputName)
  const blob = new Blob([data as Uint8Array], { type: 'video/mp4' })
  return { blob, outputName }
}

