import { mintplayerEncodeUtf8 } from './mintplayer-encode-utf8';

describe('mintplayerEncodeUtf8', () => {
  it('should work', () => {
    expect(mintplayerEncodeUtf8()).toEqual('mintplayer-encode-utf8');
  });
});
