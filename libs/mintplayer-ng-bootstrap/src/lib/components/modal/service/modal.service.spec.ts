import { Overlay } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsModalService } from './modal.service';

@Injectable({
  providedIn: 'root'
})
class OverlayMock {
}

describe('ModalService', () => {
  let service: BsModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BsModalService,
        { provide: Overlay, useClass: OverlayMock }
      ]
    });
    service = TestBed.inject(BsModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
