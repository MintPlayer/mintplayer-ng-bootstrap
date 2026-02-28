import { CommonModule } from '@angular/common';
import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsFileUploadComponent } from '../component/file-upload.component';
import { BsFileUploadTemplateDirective } from './file-upload-template.directive';

@Component({
  selector: 'file-upload-template-test-component',
  imports: [MockComponent(BsFileUploadComponent), BsFileUploadTemplateDirective],
  template: `
    <bs-file-upload [files]="files" #fileUpload>
      <ng-template bsFileUploadTemplate let-upload>
        <div class="d-flex flex-row mx-auto">{{ upload.file.name }}</div>
      </ng-template>
    </bs-file-upload>`
})
class FileUploadTestComponent {
  @ViewChild('fileUpload') fileUpload!: BsFileUploadComponent;
  files: MockFileUpload[] = [
    { file: { name: 'file 1', size: 2000 }, progress: 20 },
    { file: { name: 'file 2', size: 6000 }, progress: 30 },
    { file: { name: 'file 3', size: 4000 }, progress: 40 },
    { file: { name: 'file 4', size: 8000 }, progress: 50 },
  ];
}

interface MockFileUpload {
  file: Partial<File>;
  progress: number;
}

describe('BsContextMenuDirective', () => {
  let fixture: ComponentFixture<FileUploadTestComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        // Unit to test
        BsFileUploadTemplateDirective,

        // Mock dependencies
        MockComponent(BsFileUploadComponent),

        // Testbench
        FileUploadTestComponent
      ],
      providers: [],
    })
    .compileComponents();
  });

  it('should create an instance', () => {
    fixture = TestBed.createComponent(FileUploadTestComponent);
    fixture.detectChanges();
  });

  it('should contain a BsFileUpload component', () => {
    expect(fixture.componentInstance.fileUpload).toBeDefined();
  });

  it('should contain a template', () => {
    expect(fixture.componentInstance.fileUpload.fileTemplate).toBeDefined();
  });
});
