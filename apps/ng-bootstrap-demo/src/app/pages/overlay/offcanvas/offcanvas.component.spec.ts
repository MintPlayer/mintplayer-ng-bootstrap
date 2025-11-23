import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { MockComponent, MockDirective, MockModule, MockProvider } from 'ng-mocks';

import { OffcanvasComponent } from './offcanvas.component';
import { GIT_REPO } from '../../../providers/git-repo.provider';

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
        MockProvider(GIT_REPO, 'https://github.com'),
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
