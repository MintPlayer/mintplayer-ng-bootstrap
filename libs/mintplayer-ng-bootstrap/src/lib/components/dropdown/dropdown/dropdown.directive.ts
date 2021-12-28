import { DOCUMENT } from '@angular/common';
import { ContentChild, Directive, Inject, IterableDiffers, OnChanges, Renderer2, SimpleChanges } from '@angular/core';
import { BsDropdownMenuDirective, BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap';

@Directive({
  selector: '[bsDropdown]'
})
export class BsDropdownDirective implements OnChanges {

  // constructor(
  //   private renderer: Renderer2,
  //   private differs: IterableDiffers,
  //   @Inject(DOCUMENT) private _document: any) {
      
  //   }

  @ContentChild(BsDropdownMenuDirective, {static: false}) private menu!: BsDropdownMenuDirective;
  @ContentChild(BsDropdownToggleDirective, {static: false}) private toggle!: BsDropdownToggleDirective;

  public isOpen = false;

  ngOnChanges(changes: SimpleChanges) {
    console.log('changes', changes);
    // if (this.isOpen) {
    //   console.log('show dropdown');
    //   const bodyContainer = this.renderer.createElement('div');
    //   this.renderer.setStyle(bodyContainer, 'position', 'absolute');
    //   this.renderer.setStyle(bodyContainer, 'z-index', '1050');
    //   this.renderer.setStyle(bodyContainer, 'background', 'orange');
    //   this.renderer.setStyle(bodyContainer, 'width', '300px');
    //   this.renderer.setStyle(bodyContainer, 'height', '300px');

    //   this.renderer.appendChild(bodyContainer, this.menu.nativeElement);
    //   this.renderer.appendChild(document, bodyContainer);
    // }
  }
}
