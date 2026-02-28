import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockComponent, MockDirective } from 'ng-mocks';

import { SplitterComponent } from './splitter.component';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective, BsToggleButtonValueAccessor } from '@mintplayer/ng-bootstrap/toggle-button';

describe('SplitterComponent', () => {
  let component: SplitterComponent;
  let fixture: ComponentFixture<SplitterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsToggleButtonComponent), MockDirective(BsToggleButtonValueAccessor), MockDirective(BsToggleButtonGroupDirective),
        SplitterComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SplitterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
