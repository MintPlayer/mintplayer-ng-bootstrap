import { BsFormatBytesPipe } from './format-bytes.pipe';

describe('FormatBytesPipe', () => {
  it('create an instance', () => {
    const pipe = new BsFormatBytesPipe();
    expect(pipe).toBeTruthy();
  });
});
