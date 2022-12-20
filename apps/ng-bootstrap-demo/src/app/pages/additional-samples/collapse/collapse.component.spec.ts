import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
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
