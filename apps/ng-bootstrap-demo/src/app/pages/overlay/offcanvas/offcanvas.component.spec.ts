import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';

import { OffcanvasComponent } from './offcanvas.component';

describe('OffcanvasComponent', () => {
  let component: OffcanvasComponent;
  let fixture: ComponentFixture<OffcanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridModule),
        MockModule(BsOffcanvasModule),
        MockDirective(BsButtonTypeDirective),
        MockComponent(BsButtonGroupComponent),
      ],
      declarations: [
        // Unit to test
        OffcanvasComponent,
      ],
      providers: [
        { provide: 'GIT_REPO', useValue: 'https://github.com' },
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OffcanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
