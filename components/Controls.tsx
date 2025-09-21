'use client';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import {
  usePCMAudioListener,
  usePCMAudioRecorderContext,
} from '@speechmatics/browser-audio-input-react';
import {
  type RealtimeTranscriptionConfig,
  useRealtimeTranscription,
} from '@speechmatics/real-time-client-react';
import { getJWT } from '@/app/actions';
import { configFromFormData } from '@/lib/config-from-form-data';
import { RECORDING_SAMPLE_RATE } from '@/lib/constants';
import { MicrophoneSelect } from './MicrophoneSelect';
import { LanguageSelect } from './LanguageSelect';
import { Slider } from './Slider';

export function Controls({
  languages,
}: { languages: (readonly [code: string, displayName: string])[] }) {
  const { startTranscription, stopTranscription, sendAudio, socketState } =
    useRealtimeTranscription();

  const { isRecording, startRecording, stopRecording } =
    usePCMAudioRecorderContext();

  // Persisted defaults
  const [defaultLanguage, setDefaultLanguage] = useState<string | undefined>(undefined);
  const [defaultDeviceId, setDefaultDeviceId] = useState<string | undefined>(undefined);

  // Initialize with SSR-safe defaults to avoid hydration mismatch
  const [maxDelayValue, setMaxDelayValue] = useState(1.5);
  const [endOfUtteranceValue, setEndOfUtteranceValue] = useState(0.5);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDefaultLanguage(window.localStorage.getItem('sm_language') || undefined);
    setDefaultDeviceId(window.localStorage.getItem('sm_deviceId') || undefined);
  }, []);

  // After mount, load saved slider values (client-only) to avoid SSR/client mismatch
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const v = window.localStorage.getItem('sm_maxDelay');
    if (v) setMaxDelayValue(parseFloat(v));
    const e = window.localStorage.getItem('sm_eouThreshold');
    if (e) setEndOfUtteranceValue(parseFloat(e));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sm_maxDelay', String(maxDelayValue));
  }, [maxDelayValue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sm_eouThreshold', String(endOfUtteranceValue));
  }, [endOfUtteranceValue]);

  usePCMAudioListener((data) => {
    // Check if the incoming data is a Float32Array and convert it to an ArrayBuffer
    if (data instanceof Float32Array) {
      const arrayBuffer = data.buffer;
      sendAudio(arrayBuffer);
    } else {
      sendAudio(data); // Assuming the data is already an acceptable format
    }
  });

  const startSession = useCallback(
    async ({
      deviceId,
      ...config
    }: RealtimeTranscriptionConfig & { deviceId?: string }) => {
      const jwt = await getJWT('rt');
      await startTranscription(jwt, config);
      await startRecording({ deviceId });
    },
    [startTranscription, startRecording],
  );

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const config = configFromFormData(formData);
      const deviceId = formData.get('deviceId')?.toString();
      config.audio_format = {
        type: 'raw',
        encoding: 'pcm_f32le',
        sample_rate: RECORDING_SAMPLE_RATE,
      };
      // Save current selections
      if (typeof window !== 'undefined') {
        const lang = formData.get('language')?.toString();
        if (lang) window.localStorage.setItem('sm_language', lang);
        if (deviceId) window.localStorage.setItem('sm_deviceId', deviceId);
      }
      startSession({ deviceId, ...config });
    },
    [startSession],
  );

  const handleFormChange = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    if (!target?.name) return;
    if (typeof window === 'undefined') return;
    if (target.name === 'language') {
      window.localStorage.setItem('sm_language', target.value);
      setDefaultLanguage(target.value);
    }
    if (target.name === 'deviceId') {
      window.localStorage.setItem('sm_deviceId', target.value);
      setDefaultDeviceId(target.value);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      try {
        if (socketState === 'open') {
          stopTranscription();
        }
      } catch {}
      try {
        stopRecording();
      } catch {}
    };
  }, [socketState, stopTranscription, stopRecording]);

  return (
    <article>
      <form onSubmit={handleSubmit} onChange={handleFormChange}>
        <div className="grid responsive-grid">
          <MicrophoneSelect disabled={isRecording} defaultDeviceId={defaultDeviceId} />
          <LanguageSelect languages={languages} disabled={isRecording} defaultLanguage={defaultLanguage} />          
        </div>
        <div className='grid'>
          <Slider
            id='maxDelay'
            name='maxDelayValue'
            label='Max Delay'
            min={0}
            max={20}
            step={0.1}
            value={maxDelayValue}
            onChange={setMaxDelayValue}
            disabled={isRecording}
          />
          <Slider
            id='endOfUtterance'
            name='endOfUtteranceValue'
            label='Silence Threshold'
            min={0}
            max={2}
            step={0.01}
            value={endOfUtteranceValue}
            onChange={setEndOfUtteranceValue}
            disabled={isRecording}
          />
        </div>
        <div className="grid">
          <StartStopButton />
        </div>
      </form>
    </article>
  );
}

function StartStopButton() {
  const { stopRecording } = usePCMAudioRecorderContext();
  const { stopTranscription } = useRealtimeTranscription();

  const stopSession = useCallback(() => {
    stopTranscription();
    stopRecording();
  }, [stopRecording, stopTranscription]);

  const connected = useRealtimeTranscription().socketState === 'open';

  if (connected) {
    return (
      <button type="button" onClick={stopSession}>
        Stop transcription
      </button>
    );
  }

  return <button type="submit">Transcribe audio</button>;
}
