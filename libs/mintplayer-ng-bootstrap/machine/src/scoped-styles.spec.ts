import { repairEventReplayBodyPaths } from './scoped-styles';

/**
 * The body platform-server emits with event replay on: the integrity marker,
 * the dispatch contract, and the replay script it inserts AFTER computing the
 * hydration paths — the one node the client must drop to match them.
 */
function serverBody(withReplay = true): Document {
  const doc = document.implementation.createHTMLDocument('');
  doc.body.innerHTML =
    '<!--nghm--><script id="ng-event-dispatch-contract">window.__jsaction_bootstrap = () => {};</script>' +
    (withReplay ? '<script>window.__jsaction_bootstrap(document.body,"ng",["click"],[]);</script>' : '') +
    '\n    <app-root></app-root>';
  return doc;
}

const shape = (doc: Document) =>
  Array.from(doc.body.childNodes).map((node) => (node.nodeType === Node.ELEMENT_NODE ? (node as Element).localName : node.nodeName));

describe('repairEventReplayBodyPaths', () => {
  it('removes the replay script, restoring the body the paths were computed against', () => {
    const doc = serverBody();
    repairEventReplayBodyPaths(doc);
    expect(shape(doc)).toEqual(['#comment', 'script', '#text', 'app-root']);
    expect(doc.getElementById('ng-event-dispatch-contract')).not.toBeNull();
  });

  it('is idempotent: a second front never removes anything else', () => {
    const doc = serverBody();
    repairEventReplayBodyPaths(doc);
    repairEventReplayBodyPaths(doc);
    expect(shape(doc)).toEqual(['#comment', 'script', '#text', 'app-root']);
  });

  it('leaves a body without event replay untouched', () => {
    const doc = serverBody(false);
    repairEventReplayBodyPaths(doc);
    expect(shape(doc)).toEqual(['#comment', 'script', '#text', 'app-root']);
  });

  it('never removes an unrelated script that follows the contract', () => {
    const doc = serverBody(false);
    doc.getElementById('ng-event-dispatch-contract')!.after(Object.assign(doc.createElement('script'), { textContent: 'console.log(1)' }));
    repairEventReplayBodyPaths(doc);
    expect(shape(doc)).toEqual(['#comment', 'script', 'script', '#text', 'app-root']);
  });
});
