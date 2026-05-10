import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { BsLiveAnnouncerService } from './live-announcer.service';

describe('BsLiveAnnouncerService', () => {
  let service: BsLiveAnnouncerService;
  let cdkAnnounceSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cdkAnnounceSpy = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [{
        provide: LiveAnnouncer,
        useValue: { announce: cdkAnnounceSpy, clear: vi.fn() },
      }],
    });
    service = TestBed.inject(BsLiveAnnouncerService);
  });

  it('forwards announce() to CDK with a polite default', async () => {
    await service.announce('5 results');
    expect(cdkAnnounceSpy).toHaveBeenCalledWith('5 results', 'polite', undefined);
  });

  it('dedupes consecutive identical messages at the same politeness', async () => {
    await service.announce('5 results');
    await service.announce('5 results');
    await service.announce('5 results');
    expect(cdkAnnounceSpy).toHaveBeenCalledTimes(1);
  });

  it('does not dedupe when the message changes', async () => {
    await service.announce('5 results');
    await service.announce('4 results');
    await service.announce('5 results');
    expect(cdkAnnounceSpy).toHaveBeenCalledTimes(3);
  });

  it('does not dedupe when politeness changes for the same message', async () => {
    await service.announce('Saved', 'polite');
    await service.announce('Saved', 'assertive');
    expect(cdkAnnounceSpy).toHaveBeenCalledTimes(2);
  });

  it('clear() resets the dedup memory so the next message announces', async () => {
    await service.announce('5 results');
    service.clear();
    await service.announce('5 results');
    expect(cdkAnnounceSpy).toHaveBeenCalledTimes(2);
  });
});
