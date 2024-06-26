import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { MockDirective, MockModule } from 'ng-mocks';

import { SlideUpDownComponent } from './slide-up-down.component';

describe('SlideUpDownComponent', () => {
  let component: SlideUpDownComponent;
  let fixture: ComponentFixture<SlideUpDownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MockModule(BsGridModule),
        MockDirective(BsButtonTypeDirective),
      ],
      declarations: [ SlideUpDownComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlideUpDownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
