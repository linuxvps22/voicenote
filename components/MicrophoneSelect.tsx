'use client';

import { useAudioDevices } from '@speechmatics/browser-audio-input-react';
import { useEffect, useState } from 'react';

export function MicrophoneSelect({ disabled, defaultDeviceId }: { disabled?: boolean; defaultDeviceId?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <label>
        Loading microphones
        <select aria-busy="true" disabled />
      </label>
    );
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return (
      <label>
        Microphone not supported in this environment
        <select disabled />
      </label>
    );
  }

  return <MicrophoneSelectInner disabled={disabled} defaultDeviceId={defaultDeviceId} />;
}

function MicrophoneSelectInner({ disabled, defaultDeviceId }: { disabled?: boolean; defaultDeviceId?: string }) {
  const devices = useAudioDevices();

  switch (devices.permissionState) {
    case 'prompt':
      return (
        <label>
          Enable mic permissions
          <select
            onClick={devices.promptPermissions}
            onKeyDown={devices.promptPermissions}
          />
        </label>
      );
    case 'prompting':
      return (
        <label>
          Enable mic permissions
          <select aria-busy="true" />
        </label>
      );
    case 'granted': {
      return (
        <label>
          Select audio device
          <select
            key={`mic-${defaultDeviceId ?? 'none'}`}
            name="deviceId"
            disabled={disabled}
            defaultValue={defaultDeviceId}
          >
            {devices.deviceList.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      );
    }
    case 'denied':
      return (
        <label>
          Microphone permission disabled
          <select disabled />
        </label>
      );
    default:
      devices satisfies never;
      return null;
  }
}
