import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFileUploadModule } from '@mintplayer/ng-bootstrap/file-upload';
import { BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap/progress-bar';
import { MockModule } from 'ng-mocks';
import { FileUploadComponent } from './file-upload.component';

describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridComponent, BsGridRowDirective),
        MockModule(BsFileUploadModule),
        MockModule(BsProgressBarModule),
      ],
      declarations: [
        // Unit to test
        FileUploadComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
