import { TestBed } from '@angular/core/testing';
import { ExtraOptions, ROUTER_CONFIGURATION } from '@angular/router';

import { BsScrollOffsetService } from './scroll-offset.service';

describe('BsScrollOffsetService', () => {
  let service: BsScrollOffsetService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{
        provide: ROUTER_CONFIGURATION,
        useValue: <ExtraOptions>{
          scrollOffset: [0, 56]
        }
      }]
    });

    service = TestBed.inject(BsScrollOffsetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return the scrollOfset', () => {
    const offset = service.getScrollOffset();
    expect(offset[1]).toBe(56);
  });
});
