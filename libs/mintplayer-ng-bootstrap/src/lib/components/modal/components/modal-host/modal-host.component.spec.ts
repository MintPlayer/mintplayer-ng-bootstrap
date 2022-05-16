import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BrowserModule } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { BsModalHostComponent } from './modal-host.component';
import { BsModalComponent } from '../modal/modal.component';

@Component({
  selector: 'bs-modal',
  template: `test`,
  providers: [
    { provide: BsModalComponent, useExisting: BsModalMockComponent }
  ]
})
class BsModalMockComponent {

}

describe('BsModalHostComponent', () => {
  let component: BsModalHostComponent;
  let fixture: ComponentFixture<BsModalHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // CommonModule,
        // BrowserModule,
        OverlayModule,
        NoopAnimationsModule
      ],
      declarations: [
        // Unit to test
        BsModalHostComponent,

        // Mock dependencies
        BsModalMockComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsModalHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
