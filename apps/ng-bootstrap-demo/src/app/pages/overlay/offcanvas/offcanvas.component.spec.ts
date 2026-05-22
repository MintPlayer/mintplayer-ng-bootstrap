import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { MockComponent, MockDirective } from 'ng-mocks';
import { GIT_REPO } from '../../../providers/git-repo.provider';

import { OffcanvasComponent } from './offcanvas.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsOffcanvasComponent, OffcanvasHeaderComponent, OffcanvasBodyComponent, BsOffcanvasHostComponent } from '@mintplayer/ng-bootstrap/offcanvas';

describe('OffcanvasComponent', () => {
  let component: OffcanvasComponent;
  let fixture: ComponentFixture<OffcanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockComponent(BsOffcanvasComponent), MockComponent(OffcanvasHeaderComponent), MockComponent(OffcanvasBodyComponent), MockComponent(BsOffcanvasHostComponent),
        MockDirective(BsButtonTypeDirective),
        MockComponent(BsButtonGroupComponent),

        // Unit to test (standalone)
        OffcanvasComponent,
      ],
      providers: [
        { provide: GIT_REPO, useValue: 'https://github.com' },
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
