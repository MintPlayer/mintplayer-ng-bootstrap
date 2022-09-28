import { Overlay } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsSnackbarService } from './snackbar.service';

@Injectable({ providedIn: 'root' })
class OverlayMock { }

describe('BsSnackbarService', () => {
  let service: BsSnackbarService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Overlay,
          useClass: OverlayMock
        },
        BsSnackbarService
      ]
    });
    service = TestBed.inject(BsSnackbarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
