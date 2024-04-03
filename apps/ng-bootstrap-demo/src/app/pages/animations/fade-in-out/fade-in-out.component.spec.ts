import { MockDirective } from 'ng-mocks';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

import { FadeInOutComponent } from './fade-in-out.component';

describe('FadeInOutComponent', () => {
  let component: FadeInOutComponent;
  let fixture: ComponentFixture<FadeInOutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(BsButtonTypeDirective),
      ],
      declarations: [
        FadeInOutComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FadeInOutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
