import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsUserAgent } from '../interfaces/user-agent';
import { BsUserAgentDirective, detectBrowser, detectOperatingSystem } from './user-agent.directive';

@Component({
  selector: 'test-host',
  imports: [BsUserAgentDirective],
  template: `<div class="own" bsUserAgent (detected)="detected.push($event)"></div>`,
})
class TestHostComponent {
  readonly detected: BsUserAgent[] = [];
}

const UA = {
  chromeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0',
  opera: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 OPR/111.0',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0',
  safariIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  unknown: 'curl/8.0',
};

describe('detectBrowser / detectOperatingSystem', () => {
  it.each([
    [UA.chromeWindows, 'Chrome', 'Windows'],
    [UA.edge, 'Edge', 'Windows'],
    [UA.opera, 'Opera', 'Windows'],
    [UA.firefoxAndroid, 'Firefox', 'Android'],
    [UA.safariIos, 'Safari', 'iOS'],
    [UA.unknown, undefined, undefined],
  ])('%s is %s on %s', (ua, browser, os) => {
    expect(detectBrowser(ua)).toBe(browser);
    expect(detectOperatingSystem(ua)).toBe(os);
  });
});

describe('BsUserAgentDirective', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const create = (ua: string) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    return { fixture, div: fixture.nativeElement.querySelector('div') as HTMLElement };
  };

  it('marks the host with the browser and OS classes, keeping its own classes', () => {
    const { div } = create(UA.firefoxAndroid);
    expect(div.classList).toContain('browser-firefox');
    expect(div.classList).toContain('os-android');
    expect(div.classList).not.toContain('os-ios');
    expect(div.classList).toContain('own');
  });

  it('adds no browser class for an unknown agent', () => {
    const { div } = create(UA.unknown);
    expect([...div.classList].some((c) => c.startsWith('browser-') || c.startsWith('os-'))).toBe(false);
  });

  it('reports what it detected once, after the first render', () => {
    vi.useFakeTimers();
    const { fixture } = create(UA.safariIos);
    expect(fixture.componentInstance.detected).toEqual([]);
    vi.runAllTimers();
    expect(fixture.componentInstance.detected).toEqual([{ os: 'iOS', webbrowser: 'Safari' }]);
  });

  it('reports nothing when destroyed before the report was due', () => {
    vi.useFakeTimers();
    const { fixture } = create(UA.chromeWindows);
    const detected = fixture.componentInstance.detected;
    fixture.destroy();
    vi.runAllTimers();
    expect(detected).toEqual([]);
  });

  it('on the server detects nothing and reports nothing', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const { fixture, div } = create(UA.chromeWindows);
    vi.runAllTimers();
    expect(div.className).toBe('own');
    expect(fixture.componentInstance.detected).toEqual([]);
  });
});
