'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import PracticeHeader from '@/components/practice-header';
import PracticeFooter from '@/components/practice-footer';
import { Button } from '@/components/ui/button';
import { buildPracticeWordContext } from '@/lib/services/practice-context';

const AGENT_WS_URL = 'wss://agent.deepgram.com/v1/agent/converse';
const AUDIO_SAMPLE_RATE = 24000;

type ChatRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface DeepgramServerMessage {
  type?: string;
  role?: string;
  content?: string;
  description?: string;
  code?: string;
}

interface TokenApiResponse {
  accessToken?: string;
  tokenType?: 'temporary_token' | 'api_key';
  error?: string;
}

interface AuthVariant {
  scheme: 'token' | 'bearer';
  value: string;
}

export default function SpeakingPracticePage() {
  const params = useParams();
  const dayId = params.id as string;

  const [loadingWords, setLoadingWords] = useState(true);
  const [requiredWords, setRequiredWords] = useState<string[]>([]);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSettingsApplied, setIsSettingsApplied] = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);

  const [statusMessage, setStatusMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [coveredWords, setCoveredWords] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const playbackCursorRef = useRef(0);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const settingsAppliedRef = useRef(false);
  const authTokenVariantsRef = useRef<AuthVariant[]>([]);
  const authVariantIndexRef = useRef(0);
  const lastAgentErrorRef = useRef('');

  useEffect(() => {
    settingsAppliedRef.current = isSettingsApplied;
  }, [isSettingsApplied]);

  const coveragePercent = useMemo(() => {
    if (requiredWords.length === 0) return 0;
    return Math.round((coveredWords.length / requiredWords.length) * 100);
  }, [coveredWords.length, requiredWords.length]);

  const coveredWordSet = useMemo(
    () => new Set(coveredWords.map((word) => word.toLowerCase())),
    [coveredWords]
  );

  const speakingPrompt = useMemo(() => {
    if (requiredWords.length === 0) {
      return [
        'You are a supportive English speaking coach.',
        'Keep responses short and clear.',
        'Ask practical speaking questions and wait for the user to answer.',
      ].join(' ');
    }

    return [
      'You are a supportive English speaking coach for vocabulary practice.',
      'The user should practice these target words in spoken English:',
      requiredWords.join(', '),
      'Rules:',
      '1) Ask one short follow-up question at a time.',
      '2) Encourage the user to use any missing target words naturally.',
      '3) Keep answers concise and conversational.',
      '4) If grammar is wrong, correct gently with one clear example sentence.',
      '5) Do not switch away from English unless the user asks.',
    ].join(' ');
  }, [requiredWords]);

  useEffect(() => {
    async function loadDayWords() {
      setLoadingWords(true);

      try {
        const context = await buildPracticeWordContext(dayId, { previousWordsPerDay: 0 });
        const uniqueWords = dedupeWords(context.words.map((word) => word.word));
        setRequiredWords(uniqueWords);

        if (uniqueWords.length === 0) {
          setStatusMessage('Add words to this day first, then open Speking Agent Live.');
        } else {
          setStatusMessage('Press Start Live Session, then speak with the agent in real time.');
        }
      } catch (error) {
        console.error('[v0] Failed to load speaking words:', error);
        setStatusMessage('Unable to load day words for speaking practice.');
      } finally {
        setLoadingWords(false);
      }
    }

    loadDayWords();
  }, [dayId]);

  useEffect(() => {
    return () => {
      void stopSession('Session ended.');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendMessage = useCallback((role: ChatRole, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role,
        content: trimmed,
      },
    ]);
  }, []);

  const clearAgentPlayback = useCallback(() => {
    const outputContext = outputAudioContextRef.current;

    playingSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // ignore
      }
      try {
        source.disconnect();
      } catch {
        // ignore
      }
    });

    playingSourcesRef.current.clear();
    playbackCursorRef.current = outputContext ? outputContext.currentTime : 0;
  }, []);

  const cleanupAudio = useCallback(async () => {
    clearAgentPlayback();

    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      processorNodeRef.current.onaudioprocess = null;
      processorNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioContextRef.current) {
      try {
        await inputAudioContextRef.current.close();
      } catch {
        // ignore
      }
      inputAudioContextRef.current = null;
    }

    if (outputAudioContextRef.current) {
      try {
        await outputAudioContextRef.current.close();
      } catch {
        // ignore
      }
      outputAudioContextRef.current = null;
    }
  }, [clearAgentPlayback]);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current !== null) {
      window.clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }, []);

  const startKeepAlive = useCallback(() => {
    stopKeepAlive();

    keepAliveIntervalRef.current = window.setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      ws.send(JSON.stringify({ type: 'KeepAlive' }));
    }, 8000);
  }, [stopKeepAlive]);

  const playAgentAudioChunk = useCallback(async (audioBuffer: ArrayBuffer) => {
    if (audioBuffer.byteLength === 0) return;

    const pcm16 = new Int16Array(audioBuffer);
    if (pcm16.length === 0) return;

    let outputContext = outputAudioContextRef.current;
    if (!outputContext) {
      outputContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
      outputAudioContextRef.current = outputContext;
      playbackCursorRef.current = outputContext.currentTime;
    }

    if (outputContext.state === 'suspended') {
      await outputContext.resume();
    }

    const float32 = int16ToFloat32(pcm16);
    const audioChunk = outputContext.createBuffer(1, float32.length, AUDIO_SAMPLE_RATE);
    audioChunk.copyToChannel(float32, 0);

    const source = outputContext.createBufferSource();
    source.buffer = audioChunk;
    source.connect(outputContext.destination);

    const startAt = Math.max(outputContext.currentTime, playbackCursorRef.current);
    source.start(startAt);
    playbackCursorRef.current = startAt + audioChunk.duration;

    playingSourcesRef.current.add(source);

    source.onended = () => {
      playingSourcesRef.current.delete(source);
      try {
        source.disconnect();
      } catch {
        // ignore
      }
    };
  }, []);

  const handleServerEvent = useCallback(
    (event: DeepgramServerMessage) => {
      const type = String(event.type || '');

      if (type === 'Welcome') {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        ws.send(
          JSON.stringify({
            type: 'Settings',
            audio: {
              input: {
                encoding: 'linear16',
                sample_rate: AUDIO_SAMPLE_RATE,
              },
              output: {
                encoding: 'linear16',
                sample_rate: AUDIO_SAMPLE_RATE,
                container: 'none',
              },
            },
            agent: {
              language: 'en',
              listen: {
                provider: {
                  type: 'deepgram',
                  model: 'nova-3',
                  smart_format: true,
                },
              },
              think: {
                provider: {
                  type: 'open_ai',
                  model: 'gpt-4o-mini',
                  temperature: 0.4,
                },
                prompt: speakingPrompt,
              },
              speak: {
                provider: {
                  type: 'deepgram',
                  model: 'aura-2-thalia-en',
                },
              },
              greeting:
                'Hello. I am your live speaking coach. Start speaking now, and I will help you use your day words naturally.',
            },
          })
        );

        setStatusMessage('Connected. Applying live agent settings...');
        return;
      }

      if (type === 'SettingsApplied') {
        setIsSettingsApplied(true);
        lastAgentErrorRef.current = '';
        setStatusMessage('Live agent ready. Speak now.');
        appendMessage('system', 'Live session started. Speak to the agent now.');
        return;
      }

      if (type === 'ConversationText') {
        const role = event.role === 'assistant' ? 'assistant' : event.role === 'user' ? 'user' : 'system';
        const content = String(event.content || '').trim();

        if (content) {
          appendMessage(role, content);

          if (role === 'user' && requiredWords.length > 0) {
            const used = requiredWords.filter((word) => {
              const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
              return regex.test(content);
            });

            if (used.length > 0) {
              setCoveredWords((current) => dedupeWords([...current, ...used]));
            }
          }
        }
        return;
      }

      if (type === 'UserStartedSpeaking') {
        clearAgentPlayback();
        setIsAgentThinking(false);
        return;
      }

      if (type === 'AgentThinking') {
        setIsAgentThinking(true);
        setStatusMessage('Agent is thinking...');
        return;
      }

      if (type === 'AgentAudioDone') {
        setIsAgentThinking(false);
        setStatusMessage('Live session running.');
        return;
      }

      if (type === 'Error') {
        const errCode = event.code ? ` (${event.code})` : '';
        lastAgentErrorRef.current = event.description
          ? `${event.code ? `${event.code}: ` : ''}${event.description}`
          : 'Unknown agent error';
        setStatusMessage(
          event.description
            ? `Agent error${errCode}: ${event.description}`
            : 'Agent error occurred.'
        );
        return;
      }

      if (type === 'Warning') {
        setStatusMessage(
          event.description
            ? `Agent warning: ${event.description}`
            : 'Agent warning received.'
        );
      }
    },
    [appendMessage, clearAgentPlayback, requiredWords, speakingPrompt]
  );

  const initializeAudioInput = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    mediaStreamRef.current = stream;

    const inputContext = new AudioContext();
    inputAudioContextRef.current = inputContext;

    if (inputContext.state === 'suspended') {
      await inputContext.resume();
    }

    const sourceNode = inputContext.createMediaStreamSource(stream);
    sourceNodeRef.current = sourceNode;

    const processor = inputContext.createScriptProcessor(4096, 1, 1);
    processorNodeRef.current = processor;

    const mutedGain = inputContext.createGain();
    mutedGain.gain.value = 0;

    sourceNode.connect(processor);
    processor.connect(mutedGain);
    mutedGain.connect(inputContext.destination);

    processor.onaudioprocess = (event) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (!settingsAppliedRef.current) return;
      if (!isMicEnabled) return;

      const inputFloat = event.inputBuffer.getChannelData(0);
      const downsampled = downsampleFloat32(
        inputFloat,
        inputContext.sampleRate,
        AUDIO_SAMPLE_RATE
      );
      const pcm16 = floatToPcm16(downsampled);

      if (pcm16.byteLength > 0) {
        ws.send(pcm16.buffer);
      }
    };

    const outputContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    outputAudioContextRef.current = outputContext;

    if (outputContext.state === 'suspended') {
      await outputContext.resume();
    }

    playbackCursorRef.current = outputContext.currentTime;
  }, [isMicEnabled]);

  const stopSession = useCallback(
    async (nextStatus = 'Session stopped.') => {
      stopKeepAlive();

      const ws = wsRef.current;
      wsRef.current = null;

      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }

      await cleanupAudio();

      setIsConnected(false);
      setIsConnecting(false);
      setIsSettingsApplied(false);
      setIsAgentThinking(false);
      setStatusMessage(nextStatus);
    },
    [cleanupAudio, stopKeepAlive]
  );

  const buildTokenVariants = useCallback((payload: TokenApiResponse): AuthVariant[] => {
    const token = payload.accessToken?.trim() || '';
    if (!token) return [];

    if (payload.tokenType === 'temporary_token') {
      return dedupeAuthVariants([
        { scheme: 'bearer', value: token },
        { scheme: 'token', value: token },
      ]);
    }

    return dedupeAuthVariants([
      { scheme: 'token', value: token },
      { scheme: 'bearer', value: token },
    ]);
  }, []);

  const openSocketWithVariant = useCallback(
    (variant: AuthVariant) => {
      const ws = new WebSocket(AGENT_WS_URL, [variant.scheme, variant.value]);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        const variantNo = authVariantIndexRef.current + 1;
        const total = authTokenVariantsRef.current.length;
        setStatusMessage(
          `Connected (${variant.scheme} auth, variant ${variantNo}/${total}). Waiting for welcome message...`
        );
        startKeepAlive();
      };

      ws.onclose = (event) => {
        const settingsApplied = settingsAppliedRef.current;
        const nextIndex = authVariantIndexRef.current + 1;
        const hasAnotherVariant = nextIndex < authTokenVariantsRef.current.length;

        if (!settingsApplied && hasAnotherVariant) {
          authVariantIndexRef.current = nextIndex;
          const nextVariant = authTokenVariantsRef.current[nextIndex];
          setStatusMessage(
            `Auth retry ${nextIndex + 1}/${authTokenVariantsRef.current.length} (${nextVariant.scheme})...`
          );
          openSocketWithVariant(nextVariant);
          return;
        }

        const reason = event.reason ? ` - ${event.reason}` : '';
        const agentError = lastAgentErrorRef.current
          ? ` | Last agent error: ${lastAgentErrorRef.current}`
          : '';
        void stopSession(`Session closed (code ${event.code})${reason}${agentError}`);
      };

      ws.onerror = () => {
        setStatusMessage('WebSocket connection error.');
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          try {
            const serverEvent = JSON.parse(event.data) as DeepgramServerMessage;
            handleServerEvent(serverEvent);
          } catch (error) {
            console.error('[v0] Failed to parse Deepgram event:', error);
          }
          return;
        }

        if (event.data instanceof ArrayBuffer) {
          await playAgentAudioChunk(event.data);
          return;
        }

        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          await playAgentAudioChunk(arrayBuffer);
        }
      };
    },
    [handleServerEvent, playAgentAudioChunk, startKeepAlive, stopSession]
  );

  const startSession = useCallback(async () => {
    if (isConnecting || isConnected) return;

    if (requiredWords.length === 0) {
      setStatusMessage('Add day words first, then start live session.');
      return;
    }

    setIsConnecting(true);
    setStatusMessage('Requesting secure token...');
    setMessages([]);
    setCoveredWords([]);

    try {
      const tokenResponse = await fetch('/api/deepgram/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttlSeconds: 30 }),
      });

      const tokenPayload = (await tokenResponse.json()) as TokenApiResponse;

      if (!tokenResponse.ok || !tokenPayload.accessToken) {
        throw new Error(tokenPayload.error || 'Failed to get Deepgram token.');
      }

      setStatusMessage('Opening microphone and live agent session...');
      await initializeAudioInput();

      const tokenVariants = buildTokenVariants(tokenPayload);
      if (tokenVariants.length === 0) {
        throw new Error('No usable authentication token variants were generated.');
      }

      authTokenVariantsRef.current = tokenVariants;
      authVariantIndexRef.current = 0;
      lastAgentErrorRef.current = '';

      openSocketWithVariant(tokenVariants[0]);
    } catch (error) {
      console.error('[v0] Failed to start live speaking session:', error);
      await stopSession(
        error instanceof Error
          ? error.message
          : 'Failed to start live speaking session.'
      );
    }
  }, [
    buildTokenVariants,
    initializeAudioInput,
    isConnected,
    isConnecting,
    openSocketWithVariant,
    requiredWords.length,
    stopSession,
  ]);

  const sendTextToAgent = useCallback(() => {
    const content = manualInput.trim();
    if (!content) return;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setStatusMessage('Session is not connected.');
      return;
    }

    ws.send(
      JSON.stringify({
        type: 'InjectUserMessage',
        content,
      })
    );

    setManualInput('');
    appendMessage('system', `Injected text: ${content}`);
  }, [appendMessage, manualInput]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PracticeHeader
        title="Speking Agent Live"
        subtitle="Talk live with Deepgram voice agent and practice your day words in real time"
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {loadingWords ? (
          <div className="flex items-center justify-center h-80">
            <p className="text-muted-foreground">Loading day words...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Live Session</h2>
              <p className="text-sm text-muted-foreground">{statusMessage}</p>

              <div className="flex flex-wrap items-center gap-3">
                {!isConnected ? (
                  <Button
                    onClick={startSession}
                    disabled={isConnecting || requiredWords.length === 0}
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
                  >
                    {isConnecting ? 'Connecting...' : 'Start Live Session'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => void stopSession('Session stopped by user.')}
                    variant="destructive"
                  >
                    End Session
                  </Button>
                )}

                <Button
                  variant="outline"
                  disabled={!isConnected}
                  onClick={() => setIsMicEnabled((current) => !current)}
                >
                  {isMicEnabled ? 'Mute Mic' : 'Unmute Mic'}
                </Button>

                <span className="text-xs text-muted-foreground rounded border border-border px-2 py-1">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                <span className="text-xs text-muted-foreground rounded border border-border px-2 py-1">
                  {isSettingsApplied ? 'Ready' : 'Initializing'}
                </span>
                <span className="text-xs text-muted-foreground rounded border border-border px-2 py-1">
                  {isAgentThinking ? 'Agent Thinking' : 'Agent Listening'}
                </span>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">Target Words</h3>
                <span className="text-sm text-muted-foreground">Coverage: {coveragePercent}%</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {requiredWords.map((word) => {
                  const covered = coveredWordSet.has(word.toLowerCase());
                  return (
                    <span
                      key={word}
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold border ${
                        covered
                          ? 'border-green-500/40 bg-green-500/15 text-green-700'
                          : 'border-primary/30 bg-primary/10 text-primary'
                      }`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Text Injection (Optional)</h3>
              <p className="text-sm text-muted-foreground">
                Send a text message to the live agent if you want to guide the conversation.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={manualInput}
                  onChange={(event) => setManualInput(event.target.value)}
                  placeholder="Example: Ask me to use three missing words in one answer"
                  className="flex-1 h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
                <Button
                  onClick={sendTextToAgent}
                  disabled={!isConnected || manualInput.trim().length === 0}
                >
                  Send Text
                </Button>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Live Conversation</h3>

              <div className="max-h-[420px] overflow-y-auto rounded-md border border-border bg-background p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conversation yet.</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id}>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        {message.role}
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">{message.content}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      <PracticeFooter dayId={dayId} currentMode="speaking" />
    </div>
  );
}

function dedupeWords(words: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const rawWord of words) {
    const word = rawWord.trim();
    if (!word) continue;

    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(word);
  }

  return unique;
}

function dedupeAuthVariants(variants: AuthVariant[]): AuthVariant[] {
  const seen = new Set<string>();
  const unique: AuthVariant[] = [];

  for (const variant of variants) {
    const scheme = variant.scheme.trim().toLowerCase();
    const value = variant.value.trim();
    if (!scheme || !value) continue;

    const key = `${scheme}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ scheme: scheme === 'bearer' ? 'bearer' : 'token', value });
  }

  return unique;
}

function downsampleFloat32(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (outputSampleRate === inputSampleRate) {
    return new Float32Array(input);
  }

  if (outputSampleRate > inputSampleRate) {
    return new Float32Array(input);
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const outputLength = Math.round(input.length / sampleRateRatio);
  const output = new Float32Array(outputLength);

  let outputOffset = 0;
  let inputOffset = 0;

  while (outputOffset < output.length) {
    const nextInputOffset = Math.round((outputOffset + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;

    for (let i = inputOffset; i < nextInputOffset && i < input.length; i += 1) {
      accum += input[i];
      count += 1;
    }

    output[outputOffset] = count > 0 ? accum / count : 0;
    outputOffset += 1;
    inputOffset = nextInputOffset;
  }

  return output;
}

function floatToPcm16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);

  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

function int16ToFloat32(input: Int16Array): Float32Array {
  const output = new Float32Array(input.length);

  for (let i = 0; i < input.length; i += 1) {
    output[i] = input[i] / 32768;
  }

  return output;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
