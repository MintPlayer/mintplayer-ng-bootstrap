import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCopyDirective } from '@mintplayer/ng-bootstrap/copy';
import { MockDirective, MockComponent } from 'ng-mocks';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { CopyComponent } from './copy.component';
import { BsOffcanvasComponent, OffcanvasHeaderComponent, OffcanvasBodyComponent, BsOffcanvasHostComponent } from '@mintplayer/ng-bootstrap/offcanvas';

describe('CopyComponent', () => {
  let component: CopyComponent;
  let fixture: ComponentFixture<CopyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(BsCopyDirective),
        MockComponent(BsOffcanvasComponent), MockComponent(OffcanvasHeaderComponent), MockComponent(OffcanvasBodyComponent), MockComponent(BsOffcanvasHostComponent),
        MockComponent(BsCodeSnippetComponent),

        // Unit to test (standalone)
        CopyComponent,
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CopyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
