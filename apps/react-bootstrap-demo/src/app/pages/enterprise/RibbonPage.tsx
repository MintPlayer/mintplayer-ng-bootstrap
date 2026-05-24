import { useState } from 'react';
import {
  BsRibbon,
  BsRibbonTab,
  BsRibbonGroup,
  BsRibbonButton,
  BsRibbonToggleButton,
  BsRibbonCheckBox,
} from '@mintplayer/react-bootstrap/ribbon';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsRibbon activeTabId={activeTab} onTabChange={e => setActiveTab(e.detail.activeTabId)}>
  <BsRibbonTab tabId="home" label="Home">
    <BsRibbonGroup label="Clipboard">
      <BsRibbonButton itemId="paste" label="Paste" icon="..." />
      <BsRibbonButton itemId="cut"   label="Cut" />
      <BsRibbonButton itemId="copy"  label="Copy" />
    </BsRibbonGroup>
    <BsRibbonGroup label="Font">
      <BsRibbonToggleButton itemId="bold" label="Bold" />
      <BsRibbonCheckBox itemId="wrap" label="Word wrap" />
    </BsRibbonGroup>
  </BsRibbonTab>
</BsRibbon>`;

export function RibbonPage() {
  const [activeTab, setActiveTab] = useState<string | null>('home');
  const [bold, setBold] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const append = (msg: string) => setLog((l) => [msg, ...l].slice(0, 8));

  return (
    <div className="demo-page">
      <h1>Ribbon</h1>
      <p className="text-body-secondary">
        Office-style ribbon with tabs, groups, and a 14-element item
        vocabulary (buttons, split/dropdown buttons, toggle, checkbox,
        combobox, color picker, gallery, ...). Each item dispatches a
        bubbling CustomEvent.
      </p>

      <section>
        <BsRibbon
          {...{ activeTabId: activeTab } as React.ComponentProps<typeof BsRibbon>}
          onTabChange={(e) => setActiveTab(e.detail.activeTabId)}
        >
          <BsRibbonTab {...{ tabId: 'home', label: 'Home' } as React.ComponentProps<typeof BsRibbonTab>}>
            <BsRibbonGroup {...{ label: 'Clipboard' } as React.ComponentProps<typeof BsRibbonGroup>}>
              <BsRibbonButton
                {...{ itemId: 'paste', label: 'Paste' } as React.ComponentProps<typeof BsRibbonButton>}
                onItemClick={() => append('paste')}
              />
              <BsRibbonButton
                {...{ itemId: 'cut', label: 'Cut' } as React.ComponentProps<typeof BsRibbonButton>}
                onItemClick={() => append('cut')}
              />
              <BsRibbonButton
                {...{ itemId: 'copy', label: 'Copy' } as React.ComponentProps<typeof BsRibbonButton>}
                onItemClick={() => append('copy')}
              />
            </BsRibbonGroup>
            <BsRibbonGroup {...{ label: 'Font' } as React.ComponentProps<typeof BsRibbonGroup>}>
              <BsRibbonToggleButton
                {...{ itemId: 'bold', label: 'Bold', pressed: bold } as React.ComponentProps<typeof BsRibbonToggleButton>}
                onToggle={(e) => setBold(e.detail.pressed)}
              />
              <BsRibbonCheckBox
                {...{ itemId: 'wrap', label: 'Word wrap', checked: wrap } as React.ComponentProps<typeof BsRibbonCheckBox>}
                onCheckChange={(e) => setWrap(e.detail.checked)}
              />
            </BsRibbonGroup>
          </BsRibbonTab>
        </BsRibbon>
        <p className="text-body-secondary mt-2">
          Bold: <code>{String(bold)}</code> · Wrap: <code>{String(wrap)}</code>{' '}
          · Log: <code>{log.join(' → ') || '—'}</code>
        </p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
