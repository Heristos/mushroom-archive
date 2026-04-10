import React, { useRef, useState } from "react";

interface AudioPlayerProps {
  audioUrl: string;
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <audio ref={audioRef} src={audioUrl} preload="auto" />
      <button
        onClick={togglePlay}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <p className="mt-2 text-sm text-gray-500">
        Audio: {audioUrl.split("/").pop()}
      </p>
    </div>
  );
}
