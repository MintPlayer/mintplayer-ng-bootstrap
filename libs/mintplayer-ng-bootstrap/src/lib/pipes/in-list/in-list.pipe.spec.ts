import { BsInListPipe } from './in-list.pipe';

describe('BsInListPipe', () => {
  jest.setTimeout(30000);
  it('create an instance', () => {
    const pipe = new BsInListPipe();
    expect(pipe).toBeTruthy();
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // avoid jest open handle error
  });
});
