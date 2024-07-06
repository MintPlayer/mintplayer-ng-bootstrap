import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsSplitterModule } from '@mintplayer/ng-bootstrap/splitter';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { MockComponent, MockModule } from 'ng-mocks';

import { SplitterComponent } from './splitter.component';

describe('SplitterComponent', () => {
  let component: SplitterComponent;
  let fixture: ComponentFixture<SplitterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsSplitterModule),
        MockComponent(BsCheckboxComponent)
      ],
      declarations: [ SplitterComponent ]
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
