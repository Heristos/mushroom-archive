'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface MediaFile {
  name: string
  blobUrl: string
}

interface VideoPlayerProps {
  files: MediaFile[]
}

/* ─── MIME type par extension ──────────────────────────────────────── */
const MIME: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
}

const UNSUPPORTED_EXTS = ['avi', 'mov']

function getExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

/* ─── Capture miniature depuis une vidéo ──────────────────────────── */
function captureThumbnail(blobUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    const cleanup = () => {
      video.src = ''
      video.load()
    }

    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(video.duration * 0.1, 0.5)
    })

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 80
        canvas.height = 45
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          resolve(null)
          return
        }
        ctx.drawImage(video, 0, 0, 80, 45)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      } catch {
        resolve(null)
      } finally {
        cleanup()
      }
    })

    video.addEventListener('error', () => {
      cleanup()
      resolve(null)
    })
    video.src = blobUrl
  })
}

/* ─── Hook miniatures ──────────────────────────────────────────────── */
function useThumbnails(files: MediaFile[]) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const generate = async () => {
      for (const f of files) {
        if (cancelled) return
        const ext = getExt(f.name)
        if (UNSUPPORTED_EXTS.includes(ext)) continue
        const dataUrl = await captureThumbnail(f.blobUrl)
        if (!cancelled && dataUrl) {
          setThumbs((prev) => ({ ...prev, [f.blobUrl]: dataUrl }))
        }
      }
    }
    generate()
    return () => {
      cancelled = true
    }
  }, [files])

  return thumbs
}

/* ─── Bouton pixel style ───────────────────────────────────────────── */
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
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

/* ─── Composant principal ──────────────────────────────────────────── */
export default function VideoPlayer({ files }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [loop, setLoop] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPlaylist, setShowPlaylist] = useState(false)

  const thumbs = useThumbnails(files)
  const current = files[trackIndex]
  const ext = current ? getExt(current.name) : ''
  const isLikelyUnsupported = UNSUPPORTED_EXTS.includes(ext)

  /* ── Changement de piste ── */
  useEffect(() => {
    const video = videoRef.current
    if (!video || !current) return
    setVideoError(null)
    video.src = current.blobUrl
    video.playbackRate = speed
    video.loop = loop
    video.load()
    if (playing) video.play().catch(() => {})
    setCurrentTime(0)
    setDuration(0)
  }, [trackIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sync speed ── */
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed])

  /* ── Sync loop ── */
  useEffect(() => {
    if (videoRef.current) videoRef.current.loop = loop
  }, [loop])

  /* ── Events vidéo ── */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onDurationChange = () => setDuration(video.duration)
    const onEnded = () => {
      if (loop) return
      if (trackIndex < files.length - 1) setTrackIndex((i) => i + 1)
      else setPlaying(false)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => {
      const err = video.error
      if (!err) return
      if (err.code === 4 || err.code === 3) {
        const fmt = ext.toUpperCase()
        setVideoError(
          isLikelyUnsupported
            ? `Le format .${fmt} n'est pas supporté par votre navigateur. Convertissez en .mp4 ou .webm.`
            : `Impossible de lire ce fichier (.${fmt}). Codec ou conteneur non supporté.`,
        )
        setPlaying(false)
      }
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('loadedmetadata', onDurationChange)
    video.addEventListener('ended', onEnded)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('error', onError)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('loadedmetadata', onDurationChange)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('error', onError)
    }
  }, [files, trackIndex, ext, isLikelyUnsupported, loop])

  /* ── Fullscreen events ── */
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  /* ── Actions ── */
  const togglePlay = () => {
    const video = videoRef.current
    if (!video || videoError) return
    if (playing) video.pause()
    else video.play().catch((e) => setVideoError(`Erreur de lecture : ${e.message}`))
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !muted
    setMuted(!muted)
  }

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {})
    else document.exitFullscreen().catch(() => {})
  }, [])

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = parseFloat(e.target.value)
  }

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (videoRef.current) {
      videoRef.current.volume = v
      if (v > 0 && muted) {
        videoRef.current.muted = false
        setMuted(false)
      }
    }
  }

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const SPEEDS = [0.5, 1, 1.5, 2]

  if (!current) return null

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full" ref={containerRef}>
      {/* ── Header ── */}
      <div className="flex items-center bg-(--color-main) p-3 h-14 shrink-0 shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)]">
        <span className="text-white font-semibold shrink-0">Vidéo</span>
        {files.length > 1 && (
          <span className="ml-3 text-white/40 text-xs font-mono shrink-0">
            {trackIndex + 1} / {files.length}
          </span>
        )}
        <span className="ml-3 text-white/50 text-xs font-mono truncate flex-1 min-w-0">
          {current.name}
        </span>
        <span
          className="ml-2 text-[10px] font-mono px-1.5 py-0.5 uppercase shrink-0"
          style={{
            background: isLikelyUnsupported ? '#7f1d1d' : '#1f2937',
            color: isLikelyUnsupported ? '#fca5a5' : '#6b7280',
            boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          .{ext}
        </span>
        {files.length > 1 && (
          <button
            onClick={() => setShowPlaylist((v) => !v)}
            className="ml-2 md:hidden text-white/70 text-xs px-2 py-1 shrink-0"
            style={{
              background: showPlaylist ? 'var(--dark-main)' : 'transparent',
              boxShadow: showPlaylist ? 'inset 2px 2px 0 var(--dark-main)' : 'none',
            }}
          >
            ☰
          </button>
        )}
      </div>

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* ── Playlist ── */}
        {files.length > 1 && (
          <div
            className={[
              'bg-gray-800 overflow-y-auto flex-col shrink-0',
              'md:flex md:w-52 md:shadow-[inset_-2px_0_0_#1f2937]',
              showPlaylist ? 'flex' : 'hidden',
              'md:flex',
              'max-h-40 md:max-h-none w-full',
              'order-first md:order-0',
            ].join(' ')}
          >
            {files.map((f, i) => {
              const fExt = getExt(f.name)
              const thumb = thumbs[f.blobUrl]
              const unsupported = UNSUPPORTED_EXTS.includes(fExt)
              return (
                <button
                  key={f.blobUrl}
                  onClick={() => {
                    setTrackIndex(i)
                    setShowPlaylist(false)
                  }}
                  className="flex items-center gap-2 text-left px-2 py-2 text-xs border-b border-gray-700/50 w-full shrink-0"
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
                  {/* Miniature 16:9 */}
                  <div
                    className="shrink-0 flex items-center justify-center overflow-hidden"
                    style={{
                      width: 48,
                      height: 27,
                      background: '#111827',
                      boxShadow: 'inset 1px 1px 0 #1f2937',
                    }}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        style={{ width: 48, height: 27, objectFit: 'cover', display: 'block' }}
                      />
                    ) : unsupported ? (
                      <span style={{ fontSize: 8, color: '#ef4444', fontFamily: 'monospace' }}>
                        .{fExt}
                      </span>
                    ) : (
                      /* Spinner minimaliste tant que la miniature charge */
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          border: '1.5px solid #374151',
                          borderTopColor: '#6b7280',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                    )}
                  </div>
                  <span className="truncate flex-1 min-w-0">
                    {i === trackIndex && playing ? '▶ ' : ''}
                    {f.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Video + controls ── */}
        <div className="flex-1 min-h-0 bg-gray-700 shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)] flex flex-col">
          {/* Zone vidéo */}
          <div
            className="flex-1 min-h-0 relative flex items-center justify-center bg-black cursor-pointer"
            onClick={togglePlay}
          >
            <video
              ref={videoRef}
              src={current.blobUrl}
              preload="metadata"
              playsInline
              className="max-w-full max-h-full object-contain"
              style={{ display: videoError ? 'none' : 'block' }}
            />

            {videoError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 pointer-events-none">
                <div
                  className="text-xs font-mono px-1.5 py-0.5 uppercase"
                  style={{ background: '#7f1d1d', color: '#fca5a5' }}
                >
                  .{ext}
                </div>
                <p className="text-red-300 text-xs text-center max-w-xs leading-relaxed">
                  {videoError}
                </p>
              </div>
            )}

            {!playing && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-16 h-16 flex items-center justify-center opacity-70"
                  style={{
                    background: 'var(--color-main)',
                    boxShadow:
                      'inset 3px 3px 0 var(--light-main), inset -3px -3px 0 var(--dark-main)',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M6 3l15 9-15 9V3z" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* ── Barre de contrôles ── */}
          <div className="shrink-0 flex flex-col gap-2 p-3 bg-gray-800">
            {/* Seek bar */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-[10px] font-mono w-8 shrink-0">
                {fmt(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.01}
                value={currentTime}
                onChange={seek}
                disabled={!!videoError}
                className="flex-1 accent-gray-400"
                style={{ height: '4px', opacity: videoError ? 0.3 : 1 }}
              />
              <span className="text-gray-500 text-[10px] font-mono w-8 text-right shrink-0">
                {fmt(duration)}
              </span>
            </div>

            {/* Ligne 1 : nav + play + skip + volume + fullscreen */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {files.length > 1 && (
                <PixelBtn
                  onClick={() => setTrackIndex((i) => Math.max(0, i - 1))}
                  disabled={trackIndex === 0}
                  title="Précédent"
                >
                  ◀◀
                </PixelBtn>
              )}

              <PixelBtn
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 10)
                }}
                disabled={!!videoError}
                title="−10s"
                wide
              >
                −10s
              </PixelBtn>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                disabled={!!videoError}
                className="flex items-center justify-center text-white shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  background: 'var(--color-main)',
                  boxShadow:
                    'inset 3px 3px 0 var(--light-main), inset -3px -3px 0 var(--dark-main)',
                  opacity: videoError ? 0.3 : 1,
                }}
              >
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                    <rect x="2" y="1" width="4" height="12" rx="1" />
                    <rect x="8" y="1" width="4" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                    <path d="M3 1l10 6-10 6V1z" />
                  </svg>
                )}
              </button>

              <PixelBtn
                onClick={() => {
                  if (videoRef.current)
                    videoRef.current.currentTime = Math.min(duration, currentTime + 10)
                }}
                disabled={!!videoError}
                title="+10s"
                wide
              >
                +10s
              </PixelBtn>

              {files.length > 1 && (
                <PixelBtn
                  onClick={() => setTrackIndex((i) => Math.min(files.length - 1, i + 1))}
                  disabled={trackIndex === files.length - 1}
                  title="Suivant"
                >
                  ▶▶
                </PixelBtn>
              )}

              <div className="flex-1" />

              {/* Mute */}
              <PixelBtn onClick={toggleMute} title={muted ? 'Activer son' : 'Couper son'}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill={muted ? '#ef4444' : '#9ca3af'}
                >
                  <path d="M2 5h2.5L8 2v10L4.5 9H2V5z" />
                  {!muted && (
                    <path
                      d="M9.5 4.5c.8.8 1.3 1.9 1.3 2.5s-.5 1.7-1.3 2.5"
                      stroke="#9ca3af"
                      strokeWidth="1.2"
                      fill="none"
                    />
                  )}
                  {muted && (
                    <path
                      d="M10 4.5l3 5M13 4.5l-3 5"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </PixelBtn>

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={changeVolume}
                className="accent-gray-400"
                style={{ width: 56, height: '4px' }}
              />

              {/* Fullscreen */}
              <PixelBtn
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
              >
                {isFullscreen ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M5 2H2v3M9 2h3v3M5 12H2V9M9 12h3V9" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M2 5V2h3M9 2h3v3M2 9v3h3M12 9v3H9" />
                  </svg>
                )}
              </PixelBtn>
            </div>

            {/* Ligne 2 : Loop + Speed */}
            <div className="flex items-center gap-1.5">
              <PixelBtn onClick={() => setLoop((v) => !v)} active={loop} title="Répéter">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M1 4h9v2l3-3-3-3v2H0v5h1V4zM13 10H4V8l-3 3 3 3v-2h10V7h-1v3z" />
                </svg>
              </PixelBtn>

              <div className="flex-1" />

              <span className="text-gray-500 text-[10px] font-mono mr-1">×</span>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className="text-[10px] font-mono"
                  style={{
                    minWidth: 28,
                    height: 26,
                    paddingInline: 4,
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
        </div>
      </div>

      {/* Spinner CSS pour les miniatures en chargement */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
