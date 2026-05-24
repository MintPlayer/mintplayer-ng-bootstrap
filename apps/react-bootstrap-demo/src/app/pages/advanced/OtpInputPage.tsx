import { useState } from 'react';
import { BsOtpInput } from '@mintplayer/react-bootstrap/otp-input';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsOtpInput
  length={6}
  type="numeric"
  value={code}
  onValueChange={e => setCode(e.detail)}
  onComplete={e => alert("Code: " + e.detail)}
/>`;

export function OtpInputPage() {
  const [code, setCode] = useState('');
  const [completedCode, setCompletedCode] = useState<string | null>(null);

  return (
    <div className="demo-page">
      <h1>OTP input</h1>
      <p className="text-body-secondary">
        Segmented one-time-passcode input. <code>value-change</code> fires
        on every character; <code>complete</code> fires once when every
        slot is filled.
      </p>

      <section>
        <h2>6-digit numeric code</h2>
        <BsOtpInput
          {...{ length: 6, type: 'numeric', value: code } as React.ComponentProps<typeof BsOtpInput>}
          onValueChange={(e: CustomEvent<string>) => setCode(e.detail)}
          onComplete={(e: CustomEvent<string>) => setCompletedCode(e.detail)}
        />
        <p className="text-body-secondary mt-2">
          Current value: <code>{code || '—'}</code>
          {completedCode ? <> · Completed: <code>{completedCode}</code></> : null}
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
