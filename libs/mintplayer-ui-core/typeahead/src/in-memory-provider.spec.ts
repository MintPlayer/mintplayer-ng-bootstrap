import { inMemoryTypeaheadProvider } from './in-memory-provider';

const items = [{ text: 'Kruishoutem' }, { text: 'Kruibeke' }, { text: 'Gent' }];

describe('inMemoryTypeaheadProvider', () => {
  it('filters case-insensitively on the item text and honours limit', async () => {
    const provider = inMemoryTypeaheadProvider(items, { limit: 1 });
    expect(await provider('KRUI', { signal: new AbortController().signal })).toEqual([{ text: 'Kruishoutem' }]);
  });

  it('throws an AbortError when the signal is already aborted', async () => {
    const provider = inMemoryTypeaheadProvider(items);
    const controller = new AbortController();
    controller.abort();
    await expect(provider('k', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('accepts a custom filter and itemText', async () => {
    const provider = inMemoryTypeaheadProvider(['a1', 'b2'], { filter: (item, term) => item.endsWith(term) });
    expect(await provider('2', { signal: new AbortController().signal })).toEqual(['b2']);
  });
});
