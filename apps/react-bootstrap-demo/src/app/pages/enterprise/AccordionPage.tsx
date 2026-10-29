import { useState } from 'react';
import { BsAccordion, BsAccordionItem } from '@mintplayer/react-bootstrap/accordion';
import type { AccordionTabToggle } from '@mintplayer/react-bootstrap/accordion';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import './AccordionPage.css';

const SOURCE = `<BsAccordion multi highlightActiveTab
  onTabToggle={({ index, active }) => console.log(index, active)}>
  <BsAccordionItem header="Profile">Profile content</BsAccordionItem>
  <BsAccordionItem header="Sign in">Sign-in content</BsAccordionItem>
</BsAccordion>`;

const SECTIONS = [
  { title: 'Profile', body: 'Profile content' },
  { title: 'Sign in', body: 'Sign-in content' },
  { title: 'Payment', body: 'Payment content' },
] as const;

export function AccordionPage() {
  const [lastToggle, setLastToggle] = useState<string>('—');

  return (
    <div className="demo-page">
      <h1>Accordion</h1>
      <p>
        <code>BsAccordion</code> renders Bootstrap&apos;s accordion markup itself, from the
        framework-neutral <code>@mintplayer/ui-core/accordion</code> core. Each{' '}
        <code>BsAccordionItem</code> is one row: its <code>header</code> goes in the row&apos;s
        summary, its children in the collapsible region.
      </p>
      <p>
        The accordion is built on native <code>&lt;details name&gt;</code> / <code>&lt;summary&gt;</code>,
        so it stays fully interactive with JavaScript disabled — single-open exclusivity included —
        and a closed tab&apos;s content is removed from the tab order and the accessibility tree by
        the browser itself.
      </p>

      <section data-demo="single">
        <h2>Single-open</h2>
        <BsAccordion
          highlightActiveTab
          onTabToggle={({ index, active }: AccordionTabToggle) =>
            setLastToggle(`tab ${index} → ${active ? 'open' : 'closed'}`)
          }>
          {SECTIONS.map((section) => (
            <BsAccordionItem key={section.title} header={section.title}>
              <span className="d-block px-3 py-2">{section.body}</span>
            </BsAccordionItem>
          ))}
        </BsAccordion>
        <p className="mt-2">
          Last toggle: <code>{lastToggle}</code>
        </p>
      </section>

      <section data-demo="multi">
        <h2>Multi</h2>
        <BsAccordion multi>
          {SECTIONS.map((section) => (
            <BsAccordionItem key={section.title} header={section.title}>
              <span className="d-block px-3 py-2">{section.body}</span>
            </BsAccordionItem>
          ))}
        </BsAccordion>
      </section>

      <section data-demo="nested">
        <h2>Nested</h2>
        <p>Closing an outer tab collapses every accordion inside it, at any depth.</p>
        <BsAccordion className="multi-level">
          <BsAccordionItem header="Profile">
            <BsAccordion>
              <BsAccordionItem header="Email">
                <span className="d-block px-3 py-2">info@example.com</span>
              </BsAccordionItem>
              <BsAccordionItem header="Username">
                <span className="d-block px-3 py-2">user-name</span>
              </BsAccordionItem>
            </BsAccordion>
          </BsAccordionItem>
          <BsAccordionItem header="Sign in">
            <span className="d-block px-3 py-2">Sign-in content</span>
          </BsAccordionItem>
        </BsAccordion>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
