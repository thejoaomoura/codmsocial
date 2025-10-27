"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { HiPlay, HiPause } from "react-icons/hi";

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
  duration?: number; // duração em segundos
}

function formatMs(ms: number) {
  if (!ms || !isFinite(ms) || isNaN(ms)) return "00:00";
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");

  return `${mm}:${ss}`;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  className,
  duration: propDuration,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    propDuration ? propDuration * 1000 : 0,
  );
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Converte base64 data URL para blob URL
  useEffect(() => {
    const convertToBlob = async () => {
      try {
        if (audioUrl.startsWith("data:")) {
          const response = await fetch(audioUrl);
          const blob = await response.blob();

          setBlobUrl(URL.createObjectURL(blob));
        } else {
          setBlobUrl(audioUrl);
        }
      } catch (err) {
        console.error("Erro ao converter áudio:", err);
        setError("Erro ao carregar áudio");
        setBlobUrl(audioUrl);
      }
    };

    convertToBlob();

    return () => {
      if (blobUrl && blobUrl !== audioUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [audioUrl]);

  // Eventos do áudio
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !blobUrl) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime * 1000);
    const handleLoadedMetadata = () => {
      if (!propDuration) setDuration(audio.duration * 1000);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = (e: Event) => {
      console.error("Erro no áudio:", e);
      setError("Erro ao reproduzir áudio");
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [blobUrl]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || !blobUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch((err) => {
        console.error("Erro ao reproduzir:", err);
        setError("Erro ao reproduzir áudio");
      });
      setIsPlaying(true);
    }
  }, [isPlaying, blobUrl]);

  const handleSeek = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
    ) => {
      const audio = audioRef.current;

      if (!audio || !duration) return;

      let clickX = 0;

      if ("clientX" in e) {
        const rect = e.currentTarget.getBoundingClientRect();

        clickX = e.clientX - rect.left;
      }

      const percentage =
        clickX / (e.currentTarget as HTMLDivElement).offsetWidth;
      const newTime = (percentage * duration) / 1000;

      audio.currentTime = newTime;
      setCurrentTime(newTime * 1000);
    },
    [duration],
  );

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-red-500 ${className}`}>
        <span className="text-sm">❌ {error}</span>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1 h-2 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg p-2 max-w-xs ${className} bg-[#242626]`}
    >
      {/* Botão play/pause */}
      <Button
        isIconOnly
        aria-label={isPlaying ? "Pausar" : "Reproduzir"}
        className="flex-shrink-0"
        color="primary"
        size="sm"
        variant="light"
        onPress={togglePlayback}
      >
        {isPlaying ? (
          <HiPause className="w-4 h-4 text-white" />
        ) : (
          <HiPlay className="w-4 h-4 text-white" />
        )}
      </Button>

      {/* Waveform visual */}
      <div className="flex items-center gap-0.5 flex-1 min-w-0">
        {Array.from({ length: 20 }).map((_, i) => {
          const progress = duration > 0 ? currentTime / duration : 0;
          const isActive = i / 20 <= progress;

          return (
            <div
              key={i}
              className="w-0.5 rounded-full transition-colors cursor-pointer bg-[#A6ABAD]"
              role="button"
              style={{
                height: `${Math.random() * 10 + 3}px`,
                opacity: isActive ? 1 : 0.5,
              }}
              tabIndex={0}
              onClick={handleSeek}
              onKeyDown={handleSeek}
            />
          );
        })}
      </div>

      {/* Tempo */}
      <div className="text-xs font-mono flex-shrink-0 min-w-[50px] text-right text-[#A6ABAD]">
        {formatMs(currentTime)}/{formatMs(duration)}
      </div>

      {/* Audio element com track */}
      <audio ref={audioRef} preload="metadata" src={blobUrl}>
        <track default kind="captions" label="Português" srcLang="pt" />
      </audio>
    </div>
  );
};

export default AudioPlayer;
