import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsAlertComponent, BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsScrollspyDirective } from '@mintplayer/ng-bootstrap/scrollspy';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';

import { CollapseComponent } from './collapse.component';

describe('CollapseComponent', () => {
  let component: CollapseComponent;
  let fixture: ComponentFixture<CollapseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,

        // Mock dependencies
        MockModule(BsGridComponent, BsGridRowDirective),
        MockModule(BsAlertComponent, BsAlertCloseComponent),
        MockDirective(BsButtonTypeDirective),
        MockComponent(BsCodeSnippetComponent),
      ],
      declarations: [
        // Unit to test
        CollapseComponent,
        
        // Mock dependencies
        MockDirective(BsScrollspyDirective),
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CollapseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
