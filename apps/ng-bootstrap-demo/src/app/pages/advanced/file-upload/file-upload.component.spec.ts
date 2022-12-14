import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFileUploadTestingModule, BsGridTestingModule, BsProgressBarTestingModule, Color } from '@mintplayer/ng-bootstrap/testing';
import { FileUploadComponent } from './file-upload.component';

describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsGridTestingModule,
        BsFileUploadTestingModule,
        BsProgressBarTestingModule,
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
