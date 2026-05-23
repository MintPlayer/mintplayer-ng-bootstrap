import { BsCard, BsCardBody, BsCardTitle, BsCardText, BsCardImg } from '@mintplayer/react-bootstrap/card';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const SOURCE = `import { BsCard, BsCardBody, BsCardTitle, BsCardText } from '@mintplayer/react-bootstrap/card';

export function MyCard() {
  return (
    <BsCard style={{ maxWidth: '20rem' }}>
      <BsCardBody>
        <BsCardTitle>Card title</BsCardTitle>
        <BsCardText>Some quick example body text.</BsCardText>
      </BsCardBody>
    </BsCard>
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
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
