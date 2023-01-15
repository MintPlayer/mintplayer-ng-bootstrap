import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { MockModule } from 'ng-mocks';

import { SlideUpDownComponent } from './slide-up-down.component';

describe('SlideUpDownComponent', () => {
  let component: SlideUpDownComponent;
  let fixture: ComponentFixture<SlideUpDownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MockModule(BsGridModule),
        MockModule(BsButtonTypeModule),
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
