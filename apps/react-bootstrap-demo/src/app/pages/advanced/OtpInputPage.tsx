import { useState } from 'react';
import { BsOtpInput } from '@mintplayer/react-bootstrap/otp-input';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsOtpInput
  aria-label="Verification code"
  value={code}
  onValueChange={setCode}
  onComplete={(code) => verify(code)}
/>`;

export function OtpInputPage() {
  const [code, setCode] = useState('');
  const [completedCode, setCompletedCode] = useState<string | null>(null);

  return (
    <div className="demo-page">
      <h1>OTP input</h1>
      <p className="text-body-secondary">
        Segmented one-time-passcode input. <code>onValueChange</code> fires
        on every character; <code>onComplete</code> fires once when every
        box is filled. With JavaScript off it is a plain text field that
        submits under <code>name</code>.
      </p>

      <section>
        <h2>6-digit numeric code</h2>
        <BsOtpInput aria-label="Verification code" value={code} onValueChange={setCode} onComplete={setCompletedCode} />
        <p className="text-body-secondary mt-2">
          Current value: <code>{code || '—'}</code>
          {completedCode ? <> · Completed: <code>{completedCode}</code></> : null}
        </p>
      </section>

      <section>
        <h2>Product key</h2>
        <BsOtpInput aria-label="Product key" groups={[5, 5, 5, 5, 5]} type="alphanumeric" />
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
