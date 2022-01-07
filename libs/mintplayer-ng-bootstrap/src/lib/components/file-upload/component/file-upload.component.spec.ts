import { Directive, Input, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFileUploadComponent } from './file-upload.component';

@Directive({
  selector: '[bsFor]'
})
class BsForMockDirective {
  @Input() bsFor: any;
}

@Pipe({
  name: 'bsFormatBytes'
})
class BsFormatBytesMockPipe implements PipeTransform {
  transform(value: number, decimals = 2) {
    return value + " Bytes";
  }
}

describe('BsFileUploadComponent', () => {
  let component: BsFileUploadComponent;
  let fixture: ComponentFixture<BsFileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsFileUploadComponent,

        // Mock dependencies
        BsForMockDirective,
        BsFormatBytesMockPipe
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
