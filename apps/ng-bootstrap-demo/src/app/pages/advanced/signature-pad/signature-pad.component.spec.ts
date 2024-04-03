import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignaturePadComponent } from './signature-pad.component';
import { MockComponent, MockModule } from 'ng-mocks';
import { BsSignaturePadComponent } from '@mintplayer/ng-bootstrap/signature-pad';

describe('SignaturePadComponent', () => {
  let component: SignaturePadComponent;
  let fixture: ComponentFixture<SignaturePadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        MockComponent(BsSignaturePadComponent)
      ],
      declarations: [
        SignaturePadComponent
      ]
    });
    fixture = TestBed.createComponent(SignaturePadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
