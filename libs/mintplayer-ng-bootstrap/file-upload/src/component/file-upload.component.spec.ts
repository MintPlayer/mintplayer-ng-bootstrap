import { Component, Directive, Input, Pipe, PipeTransform } from '@angular/core';
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

@Component({
  selector: 'bs-list-group',
  template: `
    <ul class="list-group">
      <ng-content></ng-content>
    </ul>`
})
class BsListGroupMockComponent {}

@Component({
  selector: 'bs-list-group-item',
  template: `
    <li class="list-group-item">
      <ng-content></ng-content>
    </li>`
})
class BsListGroupItemMockComponent {}

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
        BsFormatBytesMockPipe,
        BsProgressMockComponent,
        BsProgressbarMockComponent,
        BsListGroupMockComponent,
        BsListGroupItemMockComponent
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
