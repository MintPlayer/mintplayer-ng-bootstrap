import { useCallback, useState } from 'react';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import { BsTypeahead, inMemoryTypeaheadProvider, type TypeaheadRequest } from '@mintplayer/react-bootstrap/typeahead';

interface Artist {
  id: number;
  text: string;
  genre: string;
}

const ARTISTS: Artist[] = [
  { id: 1, text: 'Michael Jackson', genre: 'Pop' },
  { id: 2, text: 'Paul Spencer', genre: 'Rock' },
  { id: 3, text: 'Noel Gallagher', genre: 'Britpop' },
  { id: 4, text: 'Chris Martin', genre: 'Alternative' },
  { id: 5, text: 'Michael Bublé', genre: 'Jazz' },
];

const instant = inMemoryTypeaheadProvider(ARTISTS);

function highlight(text: string, term: string) {
  const t = term.trim();
  const i = t ? text.toLowerCase().indexOf(t.toLowerCase()) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + t.length)}</mark>
      {text.slice(i + t.length)}
    </>
  );
}

const snippet = `<BsTypeahead
  provider={(term, { signal }) => fetch(\`/api/artists?q=\${term}\`, { signal }).then((r) => r.json())}
  debounceMs={200}
  minLength={2}
  inputLabel="Artist"
  value={value}
  onValueChange={setValue}
  onSelect={(artist) => console.log(artist)}
  renderItem={(artist, term) => <><strong>{artist.text}</strong> <small>{artist.genre}</small></>}
/>`;

export function TypeaheadPage() {
  const [aborted, setAborted] = useState(0);
  const [selected, setSelected] = useState<Artist | null>(null);
  const [value, setValue] = useState('');

  /** A slow "server" that honours the abort signal: type "mi", then quickly "mich". */
  const slow = useCallback(
    (term: string, { signal }: TypeaheadRequest) =>
      new Promise<Artist[]>((resolve, reject) => {
        const timer = setTimeout(() => resolve(ARTISTS.filter((a) => a.text.toLowerCase().includes(term.toLowerCase()))), 1500);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
          setAborted((n) => n + 1);
        });
      }),
    [],
  );

  return (
    <>
      <h1 className="text-center">Typeahead</h1>
      <p>
        A text input with asynchronous suggestions and free text, rendered by React from the same headless core as
        the Angular, Vue and web-component typeaheads. The <code>provider</code> receives an <code>AbortSignal</code>;
        a superseded request is aborted and its answer never shown.
      </p>

      <h2>Slow provider with cancellation</h2>
      <BsTypeahead<Artist>
        provider={slow}
        debounceMs={200}
        minLength={2}
        inputLabel="Artist"
        value={value}
        onValueChange={setValue}
        onSelect={setSelected}
      />
      <p className="mt-2 small text-secondary">
        Aborted requests: <span data-testid="aborted">{aborted}</span> · Selected:{' '}
        <span data-testid="selected">{selected?.text ?? '—'}</span> · Value: {value || '—'}
      </p>

      <h2>Custom row</h2>
      <BsTypeahead<Artist>
        provider={instant}
        debounceMs={0}
        inputLabel="Artist, highlighted"
        renderItem={(artist, term) => (
          <>
            {highlight(artist.text, term)} <small className="text-secondary">{artist.genre}</small>
          </>
        )}
      />

      <BsCodeSnippet code={snippet} language="tsx" />

      <h2>Keyboard</h2>
      <table className="table table-sm w-auto">
        <thead>
          <tr>
            <th>Key</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><kbd>↓</kbd> / <kbd>↑</kbd></td><td>Open the list; move the highlighted suggestion (focus stays in the input)</td></tr>
          <tr><td><kbd>Home</kbd> / <kbd>End</kbd></td><td>First / last suggestion</td></tr>
          <tr><td><kbd>Enter</kbd></td><td>Pick the highlighted suggestion, or submit the text</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Close the list</td></tr>
          <tr><td><kbd>Tab</kbd></td><td>Close the list and move on</td></tr>
        </tbody>
      </table>
    </>
  );
}
