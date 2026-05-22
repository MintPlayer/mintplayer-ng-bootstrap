import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MockComponent, MockDirective } from 'ng-mocks';
import { MultiRangeComponent } from './multi-range.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsMultiRangeComponent } from '@mintplayer/ng-bootstrap/multi-range';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
describe('MultiRangeComponent', () => {
  let component: MultiRangeComponent;
  let fixture: ComponentFixture<MultiRangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        MockComponent(BsGridComponent),
        MockDirective(BsGridRowDirective),
        MockDirective(BsGridColumnDirective),
        MockDirective(BsGridColDirective),
        MockComponent(BsMultiRangeComponent),
        MockComponent(BsCheckboxComponent),
        MockComponent(BsCodeSnippetComponent),
        MultiRangeComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MultiRangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
