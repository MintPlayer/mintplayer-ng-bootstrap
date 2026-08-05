import { useState } from 'react';
import { BsPhoneInput } from '@mintplayer/react-bootstrap/phone-input';
import { BsInputGroup } from '@mintplayer/react-bootstrap/input-group';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import type { PhoneChangeEventDetail } from '@mintplayer/web-components/phone-input';

const SOURCE = `<BsPhoneInput
  value={phone ?? ''}
  defaultCountry="be"
  inputLabel="Phone number"
  onValueChange={(e) => { setPhone(e.detail.value); setDetail(e.detail); }}
/>`;

const GROUP_SOURCE = `{/* The group joins controls that keep their own shadow
    root, which Bootstrap's own CSS cannot reach. */}
<BsInputGroup>
  <span className="addon">Tel</span>
  <BsPhoneInput defaultCountry="be" />
</BsInputGroup>`;

export function PhoneInputPage() {
  const [phone, setPhone] = useState<string | null>(null);
  const [detail, setDetail] = useState<PhoneChangeEventDetail | null>(null);
  const [locale, setLocale] = useState('');

  return (
    <div className="demo-page">
      <h1>Phone input</h1>
      <p className="text-body-secondary">
        A country picker with flags, a dial code that cannot be edited away, and
        as-you-type formatting. The value is <strong>E.164</strong> —{' '}
        <code>+32470123456</code> — or <code>null</code> while empty. Validation
        rules load per calling code on first interaction, so nothing is downloaded
        until the user reaches the field, and <code>detail.valid</code> is{' '}
        <code>undefined</code> until they arrive.
      </p>

      <section data-demo="basic">
        <h2>Basic usage</h2>
        <BsPhoneInput
          value={phone ?? ''}
          defaultCountry="be"
          inputLabel="Phone number"
          locale={locale || undefined}
          onValueChange={(e) => {
            setPhone(e.detail.value);
            setDetail(e.detail);
          }}
        />
        <p className="mt-2 mb-1">
          Value: <code>{phone ?? 'null'}</code>
        </p>
        <pre className="text-start">
          <code>{detail ? JSON.stringify(detail, null, 2) : '—'}</code>
        </pre>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>

      <section data-demo="locale">
        <h2>Localized country names</h2>
        <p className="text-body-secondary">
          Names come from <code>Intl.DisplayNames</code> and are collated in the
          viewer's language at no download cost. Switch and reopen the picker —
          the order changes, because an alphabetical list of English names is not
          alphabetical to a Dutch reader.
        </p>
        <select
          aria-label="Locale"
          className="form-select"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        >
          <option value="">Browser locale</option>
          <option value="en-US">en-US</option>
          <option value="nl-BE">nl-BE</option>
          <option value="fr-FR">fr-FR</option>
          <option value="ja-JP">ja-JP</option>
        </select>
      </section>

      <section data-demo="restricted">
        <h2>Restricting and pinning countries</h2>
        <BsPhoneInput
          defaultCountry="nl"
          allowedCountries={['be', 'nl', 'lu']}
          preferredCountries={['nl']}
          inputLabel="Benelux phone number"
        />
      </section>

      <section data-demo="group">
        <h2>Inside an input group</h2>
        <BsInputGroup>
          <span className="addon">Tel</span>
          <BsPhoneInput defaultCountry="be" inputLabel="Phone number" />
        </BsInputGroup>
        <BsCodeSnippet code={GROUP_SOURCE} language="tsx" />
      </section>
    </div>
  );
}
