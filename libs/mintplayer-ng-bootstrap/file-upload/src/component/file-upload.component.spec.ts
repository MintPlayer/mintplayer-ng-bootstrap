import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule, MockPipe } from 'ng-mocks';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap/progress-bar';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsFormatBytesPipe } from '../pipes/format-bytes/format-bytes.pipe';
import { BsFileUploadComponent } from './file-upload.component';

describe('BsFileUploadComponent', () => {
  let component: BsFileUploadComponent;
  let fixture: ComponentFixture<BsFileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsForDirective),
        MockModule(BsListGroupModule),
        MockModule(BsProgressBarModule),
        MockModule(BsTrackByModule),
      ],
      declarations: [
        // Unit to test
        BsFileUploadComponent,

        // Mock dependencies
        MockPipe(BsFormatBytesPipe),
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsFileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
