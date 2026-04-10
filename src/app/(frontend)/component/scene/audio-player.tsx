'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface MediaFile {
  name: string
  blobUrl: string
}

interface AudioPlayerProps {
  files: MediaFile[]
}

/* ─── Pochette générative ────────────────────────────────────────────
   Hash du nom → palette de 3 couleurs + formes pixelisées 64×64
   ─────────────────────────────────────────────────────────────────── */
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function drawCover(canvas: HTMLCanvasElement, name: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const S = 64
  canvas.width = S
  canvas.height = S

  const h = hashStr(name)
  const { bg, c1, c2, c3 } = getCoverPalette(name)

  // Fond
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, S, S)

  // Grille pixel 8×8
  const CELL = 8
  const rng = (seed: number) => {
    let s = seed
    return () => {
      s ^= s << 13
      s ^= s >> 7
      s ^= s << 17
      return (s >>> 0) / 0xffffffff
    }
  }
  const rand = rng(h)

  const palette = [c1, c2, c3, bg, bg, bg]

  for (let y = 0; y < S / CELL; y++) {
    for (let x = 0; x < S / CELL; x++) {
      const v = rand()
      if (v > 0.38) {
        ctx.fillStyle = palette[Math.floor(v * palette.length)]
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
      }
    }
  }

  // Quelques rectangles de structure
  const rects = ((h >> 3) % 4) + 2
  for (let i = 0; i < rects; i++) {
    const rx = hashStr(name + i) % 48
    const ry = hashStr(name + i * 7) % 48
    const rw = 8 + (hashStr(name + i * 3) % 16)
    const rh = 8 + (hashStr(name + i * 5) % 16)
    ctx.fillStyle = i % 2 === 0 ? c1 : c2
    ctx.globalAlpha = 0.25
    ctx.fillRect(rx, ry, rw, rh)
    ctx.globalAlpha = 1
  }

  // Bordure pixel intérieure
  ctx.strokeStyle = c1
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.4
  ctx.strokeRect(2, 2, S - 4, S - 4)
  ctx.globalAlpha = 1
}

/* Extrait les couleurs de la pochette sans dessiner — partagé avec le visualiseur */
function getCoverPalette(name: string): { c1: string; c2: string; c3: string; bg: string } {
  const h = hashStr(name)
  const hue = h % 360
  const hue2 = (hue + 137) % 360
  const hue3 = (hue + 251) % 360
  return {
    bg: hslToHex(hue, 30 + ((h >> 8) % 30), 12),
    c1: hslToHex(hue2, 60 + ((h >> 4) % 30), 50 + ((h >> 12) % 20)),
    c2: hslToHex(hue3, 55 + ((h >> 16) % 25), 40 + ((h >> 20) % 25)),
    c3: hslToHex(hue, 70, 65),
  }
}

function Cover({ name, size = 64 }: { name: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) drawCover(ref.current, name)
  }, [name])
  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, imageRendering: 'pixelated', flexShrink: 0 }}
    />
  )
}

/* ─── Bouton icône style pixel ─────────────────────────────────────── */
function PixelBtn({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
  wide = false,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center text-xs py-1 ${wide ? 'px-3' : 'px-2'}`}
      style={{
        minWidth: 32,
        height: 32,
        color: active ? 'white' : disabled ? '#4b5563' : '#9ca3af',
        background: active ? 'var(--color-main)' : '#374151',
        boxShadow: active
          ? 'inset 2px 2px 0 var(--dark-main), inset -2px -2px 0 var(--light-main)'
          : 'inset 2px 2px 0 #4b5563, inset -2px -2px 0 #1f2937',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

/* ─── Visualiseur WebAudio ─────────────────────────────────────────── */
function Visualizer({
  analyser,
  playing,
  progress,
  palette,
}: {
  analyser: AnalyserNode | null
  playing: boolean
  progress: number
  palette: { c1: string; c2: string; c3: string; bg: string }
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const BAR_COUNT = 48

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const barW = W / BAR_COUNT
      const gap = 1

      for (let i = 0; i < BAR_COUNT; i++) {
        let barH: number
        if (analyser && dataArray && playing) {
          analyser.getByteFrequencyData(dataArray)
          // Fréquences logarithmiques : graves à gauche, aigus à droite
          const start = Math.floor((i / BAR_COUNT) ** 1.4 * (dataArray.length * 0.7))
          const end = Math.floor(((i + 1) / BAR_COUNT) ** 1.4 * (dataArray.length * 0.7))
          let sum = 0
          for (let j = start; j <= end; j++) sum += dataArray[j] ?? 0
          const avg = sum / Math.max(1, end - start + 1)
          barH = (avg / 255) * H
          barH = Math.max(barH, 2)
        } else {
          // État statique : silhouette basée sur position
          const base =
            0.08 + Math.abs(Math.sin(i * 0.7)) * 0.25 + Math.abs(Math.sin(i * 0.3)) * 0.12
          barH = base * H
        }

        const active = (i / BAR_COUNT) * 100 < progress
        const alpha = playing ? 1 : 0.3
        ctx.globalAlpha = alpha

        if (active) {
          // Même couleurs que les carrés dominants de la pochette : c1 → c2
          const grad = ctx.createLinearGradient(0, H - barH, 0, H)
          grad.addColorStop(0, palette.c1)
          grad.addColorStop(1, palette.c2)
          ctx.fillStyle = grad
        } else {
          // Barres inactives : c1/c2 très atténués pour rester dans la même teinte
          ctx.fillStyle = playing ? palette.c2 : '#374151'
          ctx.globalAlpha = playing ? 0.18 : 0.3
        }

        ctx.fillRect(i * barW + gap / 2, H - barH, Math.max(1, barW - gap), barH)
        ctx.globalAlpha = 1
      }
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyser, playing, progress, palette])

  return (
    <canvas
      ref={canvasRef}
      width={288}
      height={64}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

/* ─── Composant principal ──────────────────────────────────────────── */
export default function AudioPlayer({ files }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [loop, setLoop] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [speed, setSpeed] = useState(1)

  const current = files[trackIndex]

  /* ─── Init / reconnect WebAudio ─── */
  const initAudioContext = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = ctx

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      const source = ctx.createMediaElementSource(audio)
      sourceRef.current = source
      source.connect(analyser)
      analyser.connect(ctx.destination)
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
  }, [])

  /* ─── Changement de piste ─── */
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    audio.src = current.blobUrl
    audio.playbackRate = speed
    audio.load()
    if (playing) audio.play().catch(() => {})
    setCurrentTime(0)
    setDuration(0)
  }, [trackIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Speed sync ─── */
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  /* ─── Events audio ─── */
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration)

    const onEnded = () => {
      if (loop) {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      if (shuffle && files.length > 1) {
        let next: number
        do {
          next = Math.floor(Math.random() * files.length)
        } while (next === trackIndex)
        setTrackIndex(next)
      } else if (trackIndex < files.length - 1) {
        setTrackIndex((i) => i + 1)
      } else {
        setPlaying(false)
      }
    }

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('loadedmetadata', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('loadedmetadata', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [files, trackIndex, loop, shuffle])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    initAudioContext()
    if (playing) audio.pause()
    else audio.play().catch(() => {})
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = parseFloat(e.target.value)
  }

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  const nextTrack = useCallback(() => {
    if (shuffle && files.length > 1) {
      let next: number
      do {
        next = Math.floor(Math.random() * files.length)
      } while (next === trackIndex)
      setTrackIndex(next)
    } else {
      setTrackIndex((i) => Math.min(files.length - 1, i + 1))
    }
  }, [shuffle, files.length, trackIndex])

  const prevTrack = useCallback(() => {
    setTrackIndex((i) => Math.max(0, i - 1))
  }, [])

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const SPEEDS = [0.5, 1, 1.5, 2]

  if (!current) return null

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      {/* Header */}
      <div className="flex items-center bg-(--color-main) p-3 h-14 shrink-0 shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)]">
        <span className="text-white font-semibold">Audio</span>
        {files.length > 1 && (
          <span className="ml-3 text-white/40 text-xs font-mono">
            {trackIndex + 1} / {files.length}
          </span>
        )}
        {files.length > 1 && (
          <button
            onClick={() => setShowPlaylist((v) => !v)}
            className="ml-auto text-white/70 text-xs px-2 py-1"
            style={{
              background: showPlaylist ? 'var(--dark-main)' : 'transparent',
              boxShadow: showPlaylist ? 'inset 2px 2px 0 var(--dark-main)' : 'none',
            }}
          >
            ☰ Playlist
          </button>
        )}
      </div>

      <div className="flex flex-1 min-h-0 relative">
        {/* ── Playlist (overlay) ── */}
        {files.length > 1 && showPlaylist && (
          <div className="absolute top-0 left-0 z-10 w-48 h-full bg-gray-800 overflow-y-auto flex flex-col shadow-[2px_0_8px_rgba(0,0,0,0.5),inset_-2px_0_0_#1f2937]">
            {files.map((f, i) => (
              <button
                key={f.blobUrl}
                onClick={() => {
                  setTrackIndex(i)
                }}
                className="flex items-center gap-2 text-left px-2 py-2 text-xs border-b border-gray-700/50 w-full"
                style={{
                  color: i === trackIndex ? 'white' : '#9ca3af',
                  background: i === trackIndex ? 'var(--color-main)' : 'transparent',
                  boxShadow:
                    i === trackIndex
                      ? 'inset 2px 2px 0 var(--dark-main), inset -2px -2px 0 var(--light-main)'
                      : 'none',
                }}
                title={f.name}
              >
                {/* Miniature pochette 24px */}
                <Cover name={f.name} size={24} />
                <span className="truncate flex-1 min-w-0">
                  {i === trackIndex && playing ? '▶ ' : ''}
                  {f.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Player ── */}
        <div className="flex-1 bg-gray-700 shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)] flex flex-col items-center justify-center gap-3 md:gap-4 p-3 md:p-6">
          {/* Pochette + info */}
          <div className="flex items-center gap-3 w-full max-w-sm">
            <div
              style={{
                boxShadow:
                  'inset 2px 2px 0 var(--dark-main, #0f2744), inset -2px -2px 0 var(--light-main, #3b82f6)',
              }}
            >
              <Cover name={current.name} size={56} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="text-gray-200 text-xs md:text-sm font-mono truncate">
                {current.name}
              </div>
              <div className="text-gray-500 text-[10px] font-mono mt-0.5">
                {fmt(currentTime)} / {fmt(duration)}
              </div>
            </div>
          </div>

          {/* Visualiseur WebAudio */}
          <div
            className="w-full max-w-sm overflow-hidden"
            style={{
              height: 56,
              background: getCoverPalette(current.name).bg,
              boxShadow: 'inset 2px 2px 0 #111827, inset -2px -2px 0 #374151',
            }}
          >
            <Visualizer
              analyser={analyserRef.current}
              playing={playing}
              progress={progress}
              palette={getCoverPalette(current.name)}
            />
          </div>

          {/* Seek bar */}
          <div className="w-full max-w-sm flex flex-col gap-1">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.01}
              value={currentTime}
              onChange={seek}
              className="w-full accent-gray-400"
              style={{ height: '4px' }}
            />
            <div className="flex justify-between text-gray-500 text-[10px] font-mono">
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          {/* Contrôles principaux */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap justify-center">
            {files.length > 1 && (
              <PixelBtn
                onClick={prevTrack}
                disabled={!shuffle && trackIndex === 0}
                title="Précédent"
              >
                ◀◀
              </PixelBtn>
            )}

            <PixelBtn
              onClick={() => {
                if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10)
              }}
              title="−10 secondes"
              wide
            >
              −10s
            </PixelBtn>

            {/* Play/Pause — plus grand */}
            <button
              onClick={togglePlay}
              className="flex items-center justify-center text-white"
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                background: 'var(--color-main)',
                boxShadow: 'inset 3px 3px 0 var(--light-main), inset -3px -3px 0 var(--dark-main)',
              }}
            >
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                  <rect x="3" y="2" width="4" height="12" rx="1" />
                  <rect x="9" y="2" width="4" height="12" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                  <path d="M4 2l10 6-10 6V2z" />
                </svg>
              )}
            </button>

            <PixelBtn
              onClick={() => {
                if (audioRef.current)
                  audioRef.current.currentTime = Math.min(duration, currentTime + 10)
              }}
              title="+10 secondes"
              wide
            >
              +10s
            </PixelBtn>

            {files.length > 1 && (
              <PixelBtn
                onClick={nextTrack}
                disabled={!shuffle && trackIndex === files.length - 1}
                title="Suivant"
              >
                ▶▶
              </PixelBtn>
            )}
          </div>

          {/* ── Ligne 2 : Loop / Shuffle / Speed ── */}
          <div className="flex items-center gap-1.5 md:gap-2 w-full max-w-sm flex-wrap">
            {/* Loop */}
            <PixelBtn onClick={() => setLoop((v) => !v)} active={loop} title="Répéter la piste">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M1 4h9v2l3-3-3-3v2H0v5h1V4zM13 10H4V8l-3 3 3 3v-2h10V7h-1v3z" />
              </svg>
            </PixelBtn>

            {/* Shuffle */}
            {files.length > 1 && (
              <PixelBtn
                onClick={() => setShuffle((v) => !v)}
                active={shuffle}
                title="Lecture aléatoire"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M9 2l3 3-3 3V6H7.5L5 9H2V8H4.5L7 5h2V3zM9 8v-1l3 3-3 3v-2H7L4.5 8.5l.7-.7L7.5 10H9z" />
                </svg>
              </PixelBtn>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Speed */}
            <div className="flex gap-0.5 items-center">
              <span className="text-gray-500 text-[10px] font-mono mr-1">×</span>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className="text-[10px] font-mono px-1.5 py-1"
                  style={{
                    minWidth: 28,
                    height: 26,
                    color: speed === s ? 'white' : '#6b7280',
                    background: speed === s ? 'var(--color-main)' : '#374151',
                    boxShadow:
                      speed === s
                        ? 'inset 2px 2px 0 var(--dark-main), inset -2px -2px 0 var(--light-main)'
                        : 'inset 1px 1px 0 #4b5563, inset -1px -1px 0 #1f2937',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 w-full max-w-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="#6b7280">
              <path d="M2 5h2.5L8 2v10L4.5 9H2V5z" />
              {volume > 0 && (
                <path
                  d="M9.5 4.5c.8.8 1.3 1.9 1.3 2.5s-.5 1.7-1.3 2.5"
                  stroke="#6b7280"
                  strokeWidth="1.2"
                  fill="none"
                />
              )}
              {volume > 0.5 && (
                <path
                  d="M11 2.5c1.3 1.3 2 3 2 4.5s-.7 3.2-2 4.5"
                  stroke="#6b7280"
                  strokeWidth="1.2"
                  fill="none"
                />
              )}
            </svg>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={changeVolume}
              className="flex-1 accent-gray-400"
              style={{ height: '4px' }}
            />
            <span className="text-gray-500 text-[10px] font-mono w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={current.blobUrl} preload="metadata" />
    </div>
  )
}
