import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCopyModule } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { MockModule } from 'ng-mocks';
import { HighlightModule } from 'ngx-highlightjs';
import { CopyComponent } from './copy.component';

describe('CopyComponent', () => {
  let component: CopyComponent;
  let fixture: ComponentFixture<CopyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsCopyModule),
        MockModule(BsOffcanvasModule),
        MockModule(HighlightModule),
      ],
      declarations: [
        // Unit to test
        CopyComponent,
      ]
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
