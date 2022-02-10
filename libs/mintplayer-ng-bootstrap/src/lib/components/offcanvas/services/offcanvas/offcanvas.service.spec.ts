import { OverlayModule } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';

import { BsOffcanvasService } from './offcanvas.service';

describe('BsOffcanvasService', () => {
  let service: BsOffcanvasService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ OverlayModule ],
      providers: [ BsOffcanvasService ]
    });
    service = TestBed.inject(BsOffcanvasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
