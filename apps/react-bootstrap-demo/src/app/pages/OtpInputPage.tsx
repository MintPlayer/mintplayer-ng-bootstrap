import { BsOtpInput } from '@mintplayer/react-bootstrap/otp-input';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const SOURCE = "<BsOtpInput />";

export function OtpInputPage() {
  return (
    <div className="demo-page">
      <h1>OTP input</h1>
      <section>
        <h2>Default</h2>
        <BsOtpInput />
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
