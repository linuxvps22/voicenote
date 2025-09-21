'use client';
import { useEffect, useMemo, useReducer, useRef } from 'react';
import {
  type RealtimeServerMessage,
  useRealtimeEventListener,
} from '@speechmatics/real-time-client-react';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';
import { exportToWord } from '@/utils/exportToWord';

let lastSpeaker: string = "";

export function Output() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Component />
    </ErrorBoundary>
  );
}

function groupBySpeaker(words: readonly Word[]) {
  const groups: { speaker: string; words: Word[] }[] = [];

  for (const word of words) {
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup || lastGroup.speaker !== word.speaker) {
      groups.push({ speaker: word.speaker, words: [word] });
    } else {
      lastGroup.words.push(word);
    }
  }

  return groups;
}

export function Component() {
  const [transcription, dispatch] = useReducer(transcriptReducer, []);
  const lastSpeakerRef = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useRealtimeEventListener('receiveMessage', (e) => {
    if(e.data.message === 'AddPartialTranscript' || e.data.message === 'AddTranscript') {
      const results = e.data.results;
      if (results.length) {
        lastSpeakerRef.current = results[results.length - 1].alternatives?.[0].speaker ?? '';
      }
    }
    if(e.data.message === 'EndOfUtterance') {
      // @ts-ignore: augmenting metadata for speaker tracking
      e.data.metadata.speaker = lastSpeakerRef.current;
    }
    dispatch(e.data)
  });

  // Auto scroll to bottom on update
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [transcription]);

  const plainText = useMemo(() => toPlainText(transcription), [transcription]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
    } catch {
      // fallback: create a temporary textarea
      const ta = document.createElement('textarea');
      ta.value = plainText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };
  
  return (
    <article>
      <header className="output-header">
        <span>Output</span>
        <span className="output-actions">
          <button onClick={handleCopy} className="secondary">Copy</button>
          <button onClick={() => exportToWord(transcription)} className="submit">
            Export to Word
          </button>
        </span>
      </header>
      <div ref={scrollRef} className="transcript-box">
        {groupBySpeaker(transcription).map(({ speaker, words }, i) => (
          <section key={`${speaker}-${i}`} className="mb-4">
            {speaker && (
              <span className="pill">
                {speaker}
              </span>
            )}
            <p className={speaker}>
              {words.map((word, index) => {
                const key = `${word.text}-${word.startTime}-${index}`;
                if (word.text === '\n') {
                  return <br key={`br-${key}`} />;
                }
                return (
                  <span
                    key={key}
                    className={word.partial ? 'partial' : ''}
                  >
                    {!word.punctuation && ' '}
                    {word.text}
                  </span>
                );
              })}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}

interface Word {
  text: string;
  speaker: string;
  startTime: number;
  endTime: number;
  punctuation: boolean;
  partial?: boolean;
}

function transcriptReducer(
  words: readonly Word[],
  event: RealtimeServerMessage,
): readonly Word[] {

  if(event.message === 'AddPartialTranscript' || event.message === 'AddTranscript') 

  if (event.message === 'AddTranscript' || event.message === 'AddPartialTranscript') {
    return [
      ...words.filter((w) => !w.partial),
      ...event.results.map((result) => ({
        text: result.alternatives?.[0].content ?? '',
        speaker: result.alternatives?.[0].speaker ?? '',
        startTime: result.start_time ?? 0,
        endTime: result.end_time ?? 0,
        punctuation: result.type === 'punctuation',
        partial: event.message === 'AddPartialTranscript',
      })),
    ];
  }

  if (event.message === 'EndOfUtterance') {
    return [
      ...words.filter((w) => !w.partial),
      {
        text: "\n", // [EOU]
        // @ts-ignore: augmenting metadata for speaker tracking
        speaker: event.metadata.speaker ?? '',
        startTime: event.metadata.start_time ?? 0,
        endTime: event.metadata.end_time ?? 0,
        punctuation: false,
      },
    ]
  }

  return words;
}

function toPlainText(words: readonly Word[]): string {
  const parts: string[] = [];
  for (const w of words) {
    if (w.partial) continue; // skip partials in copy text
    if (w.text === '\n') {
      parts.push('\n');
      continue;
    }
    if (!w.punctuation && parts.length > 0 && !parts[parts.length - 1].endsWith('\n')) {
      parts.push(' ');
    }
    parts.push(w.text);
  }
  return parts.join('');
}
