import { BsCard, BsCardBody, BsCardTitle, BsCardText, BsCardImg } from '@mintplayer/react-bootstrap/card';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

// The card WC exposes `color` and `position` as HTML attributes (via
// observedAttributes), not as typed class fields, so @lit/react doesn't surface
// them on the React props. Forward via a small cast at the call site.
const SOURCE = `import { BsCard, BsCardBody, BsCardTitle, BsCardText, BsCardImg } from '@mintplayer/react-bootstrap/card';

export function MyCard() {
  return (
    <>
      <BsCard style={{ maxWidth: '20rem' }}>
        <BsCardBody>
          <BsCardTitle>Card title</BsCardTitle>
          <BsCardText>Some quick example body text.</BsCardText>
        </BsCardBody>
      </BsCard>

      <BsCard style={{ maxWidth: '20rem' }} {...{ color: 'primary' }}>
        <BsCardBody>
          <BsCardTitle>Primary</BsCardTitle>
          <BsCardText>Coloured variant via the color attribute.</BsCardText>
        </BsCardBody>
      </BsCard>

      <BsCard style={{ maxWidth: '20rem' }}>
        <BsCardImg {...{ position: 'top', src: '/favicon.svg', alt: '' }} />
        <BsCardBody>
          <BsCardTitle>With image</BsCardTitle>
          <BsCardText>Image at the top, body below.</BsCardText>
        </BsCardBody>
      </BsCard>
    </>
  );
}`;

export function CardPage() {
  return (
    <div className="demo-page">
      <h1>Card</h1>
      <p className="text-body-secondary">
        Composable card primitives. The card family renders identically across
        Angular / React / Vue.
      </p>

      <section>
        <h2>Basic card</h2>
        <BsCard style={{ maxWidth: '20rem' }}>
          <BsCardBody>
            <BsCardTitle>Card title</BsCardTitle>
            <BsCardText>Some quick example text to build on the card title.</BsCardText>
          </BsCardBody>
        </BsCard>
      </section>

      <section>
        <h2>Colour variant</h2>
        <BsCard style={{ maxWidth: '20rem' }} {...{ color: 'primary' }}>
          <BsCardBody>
            <BsCardTitle>Primary</BsCardTitle>
            <BsCardText>Coloured variant via the <code>color</code> attribute.</BsCardText>
          </BsCardBody>
        </BsCard>
      </section>

      <section>
        <h2>Image at the top</h2>
        <BsCard style={{ maxWidth: '20rem' }}>
          <BsCardImg {...{ position: 'top', src: '/favicon.svg', alt: '' }} />
          <BsCardBody>
            <BsCardTitle>With image</BsCardTitle>
            <BsCardText>Image at the top, body below.</BsCardText>
          </BsCardBody>
        </BsCard>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
