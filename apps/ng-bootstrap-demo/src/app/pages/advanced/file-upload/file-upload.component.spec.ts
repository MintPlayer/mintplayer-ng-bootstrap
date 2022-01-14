import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileUploadComponent } from './file-upload.component';

enum Color {
  primary,
  secondary,
  success,
  danger,
  warning,
  info,
  light,
  dark,
  body,
  white,
  transparent
}

@Component({
  selector: 'bs-progress',
  template: 'progress'
})
class BsProgressMockComponent {
  @Input() public height = 30;
  @Input() public isIndeterminate = false;
}

@Component({
  selector: 'bs-progress-bar',
  template: 'progressbar'
})
class BsProgressbarMockComponent {
  @Input() public minimum = 0;
  @Input() public maximum = 100;
  @Input() public value = 50;
  @Input() public color = Color;
  @Input() public striped = false;
  @Input() public animated = false;
}

interface FileUpload {
  file: File;
  progress: number;
}

@Component({
  selector: 'bs-file-upload',
  template: 'File-upload works'
})
class BsFileUploadMockComponent {
  @Input() files: FileUpload[] = [];
}

describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        FileUploadComponent,
      
        // Mock dependencies
        BsProgressMockComponent,
        BsProgressbarMockComponent,
        BsFileUploadMockComponent
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
