import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDirective, MockPipe, MockComponent } from 'ng-mocks';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsFormatBytesPipe } from '../pipes/format-bytes/format-bytes.pipe';
import { BsFileUploadComponent } from './file-upload.component';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsProgressComponent, BsProgressBarComponent } from '@mintplayer/ng-bootstrap/progress-bar';

describe('BsFileUploadComponent', () => {
  let component: BsFileUploadComponent;
  let fixture: ComponentFixture<BsFileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockDirective(BsForDirective),
        MockComponent(BsListGroupComponent), MockComponent(BsListGroupItemComponent),
        MockComponent(BsProgressComponent), MockComponent(BsProgressBarComponent),
        // Unit to test
        BsFileUploadComponent,

        // Mock dependencies
        MockPipe(BsFormatBytesPipe),
      ],
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
