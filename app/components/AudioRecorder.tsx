"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { HiMicrophone, HiStop, HiPlay, HiPause, HiArrowRight, HiX, HiLockClosed, HiLockOpen } from "react-icons/hi";

/**
 * - UI inspirada no WhatsApp 
 * - Usa MediaRecorder + getUserMedia
 * - Gera Blob/File (onSend) e URL local (prévia)
 * - Barra de nível (VU) em tempo real durante a gravação
 * - Limites de duração e tamanho do arquivo
 */

type RecorderPermission = "prompt" | "granted" | "denied" | "unsupported";

type VoiceMeta = {
  durationMs: number;
  sizeBytes: number;
  mimeType: string;
  filename: string;
};

export interface AudioRecorderProps {
  onAudioRecorded?: (audioBlob: Blob, duration: number) => void;
  onSendAudio?: (audioBlob: Blob, duration: number) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  disabled?: boolean;
  maxDurationMs?: number; // default 60s
  maxSizeBytes?: number;  // default 2MB
  preferredMimeType?: string; // ex: "audio/webm;codecs=opus"
  className?: string;
}

const MIME_FALLBACKS = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
];

function pickSupportedMime(preferred?: string) {
  if (typeof window === "undefined" || !(window as any).MediaRecorder) return null;
  const list = preferred ? [preferred, ...MIME_FALLBACKS] : MIME_FALLBACKS;
  for (const m of list) {
    try {
      if ((window as any).MediaRecorder.isTypeSupported?.(m)) return m;
    } catch {}
  }
  // Última tentativa sem especificar
  return ""; // deixar o browser decidir
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"] as const;
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Função helper para logs apenas em desenvolvimento
function devLog(...args: any[]) {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    console.log(...args);
  }
}

function devError(...args: any[]) {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    console.error(...args);
  }
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioRecorded,
  onSendAudio,
  onRecordingStateChange,
  disabled,
  maxDurationMs = 60_000,
  maxSizeBytes = 2 * 1024 * 1024,
  preferredMimeType,
  className,
}) => {
  const [permission, setPermission] = useState<RecorderPermission>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [sizeBytes, setSizeBytes] = useState(0);
  const [level, setLevel] = useState(0); // 0..1
  const [isLocked, setIsLocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const rafRef = useRef<number | null>(null);
  const startAtRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const supportedMime = useMemo(() => pickSupportedMime(preferredMimeType), [preferredMimeType]);

  // Verifica suporte básico
  const isSupported = typeof window !== "undefined" && !!(navigator.mediaDevices?.getUserMedia) && (window as any).MediaRecorder;

  useEffect(() => {
    if (!isSupported) {
      setPermission("unsupported");
    }
  }, [isSupported]);

  // Atualiza o cronômetro enquanto grava
  useEffect(() => {
    if (!isRecording || isPaused) return;
    let raf: number;
    const tick = (t: number) => {
      if (!lastTickRef.current) lastTickRef.current = t;
      const now = performance.now();
      const elapsed = now - startAtRef.current;
      setElapsedMs(elapsed);
      // Auto stop por duração
      if (elapsed >= maxDurationMs) {
        stopRecording();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRecording, isPaused, maxDurationMs]);

  // VU meter
  const startMeter = useCallback(() => {
    if (!mediaStreamRef.current) return;
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioCtxRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;
    sourceRef.current = audioCtxRef.current.createMediaStreamSource(mediaStreamRef.current);
    sourceRef.current.connect(analyserRef.current);

    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    const loop = () => {
      analyserRef.current?.getByteTimeDomainData(data);
      // Normaliza o pico
      let max = 0;
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128) / 128; // 0..1
        if (v > max) max = v;
      }
      setLevel(max);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try {
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      audioCtxRef.current?.close();
    } catch {}
    sourceRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setPermission("granted");

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        try {
          // Verificar se temos chunks válidos
          if (chunksRef.current.length === 0) {
            devError('Nenhum chunk de áudio foi gravado');
            setError('Erro na gravação - nenhum áudio capturado');
            return;
          }

          // Criar blob com tipo mais específico
          const mimeType = supportedMime || "audio/webm;codecs=opus";
          const finalBlob = new Blob(chunksRef.current, { type: mimeType });
          
        // Validar se o blob tem conteúdo
        if (finalBlob.size === 0) {
          devError('Blob de áudio vazio');
          setError('Erro na gravação - áudio vazio');
          return;
        }

        // Validar tamanho mínimo (pelo menos alguns bytes)
        if (finalBlob.size < 100) {
          devError('Blob muito pequeno, possível gravação inválida');
          setError('Gravação muito curta ou inválida');
          return;
        }
        
        devLog('Blob criado com sucesso:', {
          size: finalBlob.size,
          type: finalBlob.type,
          supportedMime,
          chunksCount: chunksRef.current.length,
          totalChunksSize: chunksRef.current.reduce((acc, chunk) => acc + (chunk instanceof Blob ? chunk.size : 0), 0)
        });
          
          setBlob(finalBlob);
          setSizeBytes(finalBlob.size);
          
          // Criar URL para preview com validação
          try {
            const url = URL.createObjectURL(finalBlob);
            setBlobUrl(url);
            devLog('Blob URL criado com sucesso:', url);
            
            // Testar se a URL é válida
            const testAudio = new Audio();
            testAudio.src = url;
            testAudio.onerror = () => {
              devError('URL do blob é inválida');
              URL.revokeObjectURL(url);
              setError('Erro ao criar preview do áudio');
            };
            testAudio.onloadeddata = () => {
              devLog('Blob URL validado com sucesso');
              URL.revokeObjectURL(url); // Limpar o teste
            };
            
          } catch (urlError) {
            devError('Erro ao criar blob URL:', urlError);
            setError('Erro ao processar áudio gravado');
            return;
          }

          // Callback para componente pai
          if (onAudioRecorded) {
            onAudioRecorded(finalBlob, elapsedMs / 1000);
          }

        } catch (blobError) {
          devError('Erro ao processar gravação:', blobError);
          setError('Erro ao processar áudio gravado');
          return;
        } finally {
          // Limpar stream
          stream.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
          stopMeter();
        }
      };

      recorder.start(100); // chunk a cada 100ms
      setIsRecording(true);
      setElapsedMs(0);
      startAtRef.current = performance.now();
      lastTickRef.current = 0;
      
      startMeter();
      
      if (onRecordingStateChange) {
        onRecordingStateChange(true);
      }
    } catch (err) {
      devError("Erro ao iniciar gravação:", err);
      setError("Erro ao acessar microfone");
      setPermission("denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsLocked(false);
      
      if (onRecordingStateChange) {
        onRecordingStateChange(false);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsLocked(false);
      
      // Limpar dados
      chunksRef.current = [];
      setElapsedMs(0);
      
      if (onRecordingStateChange) {
        onRecordingStateChange(false);
      }
    }
  };

  const cancelAudio = () => {
    // Parar reprodução se estiver tocando
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    
    // Limpar blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
    
    // Resetar estados
    setBlobUrl(null);
    setBlob(null);
    setSizeBytes(0);
    setElapsedMs(0);
    setIsPlaying(false);
    setError(null);
    
    // Limpar referências
    (window as any).tempAudioData = null;
    
    // Notificar que não está mais gravando
    if (onRecordingStateChange) {
      onRecordingStateChange(false);
    }
  };

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      stopMeter();
    };
  }, [blobUrl, stopMeter]);

  const sendAudio = () => {
    if (blob && onSendAudio) {
      onSendAudio(blob, elapsedMs / 1000);
      cancelAudio();
    }
  };

  const togglePlayback = async () => {
    if (!audioRef.current || !blobUrl || !blob) {
      devLog('togglePlayback: Recursos não disponíveis', {
        hasAudioRef: !!audioRef.current,
        hasBlobUrl: !!blobUrl,
        hasBlob: !!blob
      });
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        devLog('Tentando reproduzir áudio...', {
          blobSize: blob.size,
          blobType: blob.type,
          blobUrl: blobUrl
        });
        
        // Verificar se o blob é válido
        if (blob.size === 0) {
          devError('Blob de áudio está vazio');
          setError('Áudio inválido - arquivo vazio');
          return;
        }

        // Verificar se o áudio pode ser reproduzido
        const canPlay = audioRef.current.readyState >= 2; // HAVE_CURRENT_DATA
        if (!canPlay) {
          devLog('Áudio não está pronto, aguardando...');
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
              reject(new Error('Timeout ao carregar áudio'));
            }, 5000); // 5 segundos timeout

            const onCanPlay = () => {
              clearTimeout(timeout);
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
              resolve(void 0);
            };

            const onError = (e: Event) => {
              clearTimeout(timeout);
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
              reject(e);
            };

            audioRef.current?.addEventListener('canplay', onCanPlay);
            audioRef.current?.addEventListener('error', onError);
          });
        }
        
        await audioRef.current.play();
        setIsPlaying(true);
        devLog('Áudio reproduzindo com sucesso');
      }
    } catch (error) {
      devError('Erro ao reproduzir áudio:', error);
      setIsPlaying(false);
      
      // Tentar recriar o blob URL se houver erro
      if (blob && blob.size > 0) {
        devLog('Tentando recriar blob URL...');
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
        
        // Verificar se o blob ainda é válido
        try {
          const newBlobUrl = URL.createObjectURL(blob);
          setBlobUrl(newBlobUrl);
          devLog('Novo blob URL criado:', newBlobUrl);
          
          // Tentar recarregar o áudio
          if (audioRef.current) {
            audioRef.current.load();
          }
        } catch (urlError) {
          devError('Erro ao criar novo blob URL:', urlError);
          setError('Erro ao processar áudio');
        }
      }
    }
  };

  // Estado inicial - apenas botão de microfone
  if (!isRecording && !blob) {
    return (
      <Button
        isIconOnly
        size="sm"
        color="primary"
        variant="light"
        onPress={startRecording}
        disabled={disabled || !isSupported || permission === "denied"}
        className={className}
        aria-label="Gravar áudio"
      >
        <HiMicrophone className="w-5 h-5" />
      </Button>
    );
  }

  // Estado de gravação
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
        {/* Botão cancelar */}
        <Button
          isIconOnly
          size="sm"
          color="danger"
          variant="light"
          onPress={cancelRecording}
          aria-label="Cancelar gravação"
        >
          <HiX className="w-4 h-4" />
        </Button>

        {/* VU Meter */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-4 rounded-full transition-colors ${
                level > i / 10 
                  ? "bg-red-500" 
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        {/* Timer */}
        <span className="text-sm font-mono text-red-600 dark:text-red-400">
          {formatMs(elapsedMs)}
        </span>

        {/* Botão lock */}
        <Button
          isIconOnly
          size="sm"
          color={isLocked ? "warning" : "default"}
          variant="light"
          onPress={() => setIsLocked(!isLocked)}
          aria-label={isLocked ? "Desbloquear" : "Bloquear"}
        >
          {isLocked ? <HiLockClosed className="w-4 h-4" /> : <HiLockOpen className="w-4 h-4" />}
        </Button>

        {/* Botão stop */}
        <Button
          isIconOnly
          size="sm"
          color="primary"
          variant="solid"
          onPress={stopRecording}
          aria-label="Parar gravação"
        >
          <HiStop className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Estado pós-gravação (preview)
  if (blob && blobUrl) {
    return (
      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
        {/* Exibir erro se houver */}
        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs px-2 py-1 rounded-t-lg">
            {error}
          </div>
        )}
        {/* Botão play/pause */}
        <Button
          isIconOnly
          size="sm"
          color="primary"
          variant="light"
          onPress={togglePlayback}
          aria-label={isPlaying ? "Pausar" : "Reproduzir"}
        >
          {isPlaying ? <HiPause className="w-4 h-4" /> : <HiPlay className="w-4 h-4" />}
        </Button>

        {/* Visualização do áudio */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-0.5 bg-blue-500 rounded-full"
              style={{
                height: `${Math.random() * 16 + 4}px`, // Simulação de waveform
              }}
            />
          ))}
        </div>

        {/* Duração e tamanho */}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {formatMs(elapsedMs)} • {formatBytes(sizeBytes)}
        </div>

        {/* Botão cancelar */}
        <Button
          isIconOnly
          size="sm"
          color="danger"
          variant="light"
          onPress={cancelAudio}
          aria-label="Cancelar áudio"
        >
          <HiX className="w-4 h-4" />
        </Button>

        {/* Botão enviar */}
        <Button
          isIconOnly
          size="sm"
          color="success"
          variant="solid"
          onPress={sendAudio}
          aria-label="Enviar áudio"
        >
          <HiArrowRight className="w-4 h-4" />
        </Button>

        {/* Audio element para preview */}
        <audio
          ref={audioRef}
          src={blobUrl || undefined}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            const target = e.target as HTMLAudioElement;
            const error = target.error;
            let errorMessage = 'Erro desconhecido no áudio';
            
            if (error) {
              switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                  errorMessage = 'Reprodução abortada';
                  break;
                case MediaError.MEDIA_ERR_NETWORK:
                  errorMessage = 'Erro de rede ao carregar áudio';
                  break;
                case MediaError.MEDIA_ERR_DECODE:
                  errorMessage = 'Erro ao decodificar áudio';
                  break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                  errorMessage = 'Formato de áudio não suportado';
                  break;
                default:
                  errorMessage = `Erro de mídia (código: ${error.code})`;
              }
            }
            
            devError('Erro no elemento audio:', {
              error: errorMessage,
              code: error?.code,
              message: error?.message,
              blobUrl,
              blobSize: blob?.size,
              blobType: blob?.type
            });
            
            setIsPlaying(false);
            setError(errorMessage);
            
            // Tentar recriar o blob URL se o erro for de formato não suportado
            if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED && blob) {
              devLog('Tentando recriar blob URL devido a formato não suportado...');
              if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
              }
              try {
                const newBlobUrl = URL.createObjectURL(blob);
                setBlobUrl(newBlobUrl);
                devLog('Novo blob URL criado após erro de formato:', newBlobUrl);
              } catch (urlError) {
                devError('Erro ao recriar blob URL:', urlError);
              }
            }
          }}
          onLoadedData={() => {
            devLog('Áudio carregado com sucesso', {
              duration: audioRef.current?.duration,
              readyState: audioRef.current?.readyState
            });
            setError(null); // Limpar erros anteriores
          }}
          onLoadStart={() => {
            devLog('Iniciando carregamento do áudio');
          }}
          onCanPlay={() => {
            devLog('Áudio pode ser reproduzido');
          }}
          preload="metadata"
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  return null;
};

export default AudioRecorder;