import { BsTrustHtmlPipe } from './trust-html.pipe';

describe('BsTrustHtmlPipe', () => {
  it('create an instance', () => {
    const pipe = new BsTrustHtmlPipe(null!);
    expect(pipe).toBeTruthy();
  });
});
