import type { RealtimeTranscriptionConfig } from '@speechmatics/real-time-client-react';

// TODO could have zod schemas here
export function configFromFormData(
  formData: FormData,
): RealtimeTranscriptionConfig {
  const language = formData.get('language')?.toString();

  if (!language) {
    throw new Error('Language is required');
  }

  const maxDelayValue = parseFloat(
    formData.get('maxDelayValue')?.toString() ?? '1.5'
  );
  const endOfUtteranceValue = parseFloat(
    formData.get('endOfUtteranceValue')?.toString() ?? '0.5'
  );

  return {
    transcription_config: {
      language,
      max_delay: maxDelayValue,
      operating_point: 'enhanced',
      enable_partials: true,
      diarization: 'none',
      conversation_config: {
        end_of_utterance_silence_trigger: endOfUtteranceValue
      }
    },
  };
}
