import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFileUploadTestingModule, BsGridTestingModule, Color } from '@mintplayer/ng-bootstrap/testing';
import { FileUploadComponent } from './file-upload.component';

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

describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsGridTestingModule,
        BsFileUploadTestingModule,
      ],
      declarations: [
        // Unit to test
        FileUploadComponent,
      
        // Mock dependencies
        BsProgressMockComponent,
        BsProgressbarMockComponent,
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
