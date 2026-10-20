import { stampScope } from './stamp-scope';
import { writeScopedStyleTag } from './install-scoped-styles';

describe('stampScope', () => {
  it('stamps the root and every descendant, and leaves another scope alone', () => {
    const root = document.createElement('div');
    root.innerHTML = '<span><b></b></span><i data-mps="other"><u></u></i>';
    stampScope(root, 'typeahead');
    expect(root.getAttribute('data-mps')).toBe('typeahead');
    expect(root.querySelector('b')!.getAttribute('data-mps')).toBe('typeahead');
    expect(root.querySelector('i')!.getAttribute('data-mps')).toBe('other');
    expect(root.querySelector('u')!.hasAttribute('data-mps')).toBe(false);
  });

  it('rejects an invalid scope', () => {
    expect(() => stampScope(document.createElement('div'), 'Bad Scope')).toThrow(/invalid scope/);
  });
});

describe('writeScopedStyleTag', () => {
  it('writes the marker style once into the given document', () => {
    const doc = document.implementation.createHTMLDocument('ssr');
    expect(writeScopedStyleTag(doc, 'w-a', 'x{}')).toBe(true);
    expect(writeScopedStyleTag(doc, 'w-a', 'x{}')).toBe(false);
    const tags = doc.head.querySelectorAll('style[data-mp-light-styles="w-a"]');
    expect(tags).toHaveLength(1);
    expect(tags[0].textContent).toBe('x{}');
  });
});
