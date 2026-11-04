import { describe, expect, it } from 'vitest';
import { activeSectionIndex, connectScrollspy, headingLevel, sectionScrollTop } from './scrollspy.core';

const inputs = { label: 'Section navigation', scrollContainer: null, offset: 0 };
const sections = [
  { text: 'Intro', level: 2 },
  { text: 'Details', level: 3 },
];

describe('scrollspy', () => {
  it('is a named navigation; a consumer aria-label wins', () => {
    const view = connectScrollspy(inputs, { sections, active: 0, contained: false });
    expect(view.nav).toEqual({ class: 'spy', 'aria-label': 'Section navigation' });
    expect(connectScrollspy(inputs, { sections, active: 0, contained: false }, 'On this page').nav['aria-label']).toBe('On this page');
  });

  it('marks the active entry as the current location, not only bold', () => {
    const view = connectScrollspy(inputs, { sections, active: 1, contained: false });
    expect(view.entries.map((entry) => entry.button['aria-current'])).toEqual([null, 'location']);
    expect(view.entries[1].button['class']).toContain('fw-bold');
    expect(view.entries[0].button['class']).not.toContain('fw-bold');
    expect(view.entries.map((entry) => entry.text)).toEqual(['Intro', 'Details']);
  });

  it('entries are real buttons, indented by heading level', () => {
    const [intro, details] = connectScrollspy(inputs, { sections, active: 0, contained: false }).entries;
    expect(intro.button['type']).toBe('button');
    expect(intro.button['class']).toContain('scrollspy-level-2');
    expect(details.button['class']).toContain('scrollspy-level-3');
  });

  it('renders an empty list until hydration finds the sections', () => {
    expect(connectScrollspy(inputs, { sections: [], active: -1, contained: false }).entries).toEqual([]);
  });

  it('marks the root when a container, not the window, scrolls', () => {
    expect(connectScrollspy(inputs, { sections, active: 0, contained: true }).root['data-contained']).toBe('');
    expect(connectScrollspy(inputs, { sections, active: 0, contained: false }).root['data-contained']).toBeNull();
  });
});

describe('scrollspy geometry', () => {
  it('the active section is the last one past the trigger line, else the first', () => {
    expect(activeSectionIndex([], 10)).toBe(-1);
    expect(activeSectionIndex([50, 300, 900], 10)).toBe(0);
    expect(activeSectionIndex([-400, 5, 900], 10)).toBe(1);
    expect(activeSectionIndex([-900, -500, -1], 10)).toBe(2);
  });

  it('scrolling to a section puts it 1px past the trigger line', () => {
    expect(sectionScrollTop(500, 60, 100)).toBe(541);
  });

  it('reads the level from the tag name', () => {
    expect(headingLevel('H2')).toBe(2);
    expect(headingLevel('h4')).toBe(4);
    expect(headingLevel('P')).toBe(0);
  });
});
