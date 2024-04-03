import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsScrollspyDirective } from '@mintplayer/ng-bootstrap/scrollspy';
import { MockDirective, MockModule } from 'ng-mocks';

import { CollapseComponent } from './collapse.component';

describe('CollapseComponent', () => {
  let component: CollapseComponent;
  let fixture: ComponentFixture<CollapseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,

        // Mock dependencies
        MockModule(BsGridModule),
        MockModule(BsAlertModule),
        MockModule(BsButtonTypeDirective),
        MockModule(BsCodeSnippetComponent),
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
