import { Component, Directive, Input, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsForTestingModule, BsListGroupTestingModule, BsProgressBarTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { BsFileUploadComponent } from './file-upload.component';

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
      imports: [
        BsForTestingModule,
        BsListGroupTestingModule,
        BsProgressBarTestingModule,
      ],
      declarations: [
        // Unit to test
        BsFileUploadComponent,

        // Mock dependencies
        BsFormatBytesMockPipe,
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
