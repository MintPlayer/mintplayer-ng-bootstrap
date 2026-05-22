import { encodeUtf8 } from './encode-utf8';

describe('mintplayerEncodeUtf8', () => {
  it('should work', () => {
    const encoded = encodeUtf8('example');
    expect(encoded).toBeDefined();
  });
});
