import { Directive, EmbeddedViewRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[bsTemplateOutlet]'
})
export class CustomTemplateOutletDirective implements OnChanges {
  private _viewRef: EmbeddedViewRef<any> | null = null;

  @Input() public bsTemplateOutletContext: Object | null = null;
  @Input() public bsTemplateOutlet: TemplateRef<any> | null = null;
  @Output() public bsTemplateImagesLoaded = new EventEmitter();

  constructor(private viewContainerRef: ViewContainerRef) {}

  private numberOfLoadedImages = 0;
  ngOnChanges(changes: SimpleChanges) {
    if (changes['bsTemplateOutlet']) {

      const vcr = this.viewContainerRef;
      if (this._viewRef) {
        vcr.remove(vcr.indexOf(this._viewRef));
      }
      this._viewRef = this.bsTemplateOutlet ? vcr.createEmbeddedView(this.bsTemplateOutlet, this.bsTemplateOutletContext) : null;
      
      if (this._viewRef) {
        const allImages = this._viewRef?.rootNodes
          .map(node => <HTMLElement>node)
          .map(node => Array.from(node.querySelectorAll('img')))
          .reduce((flat, toFlatten) => flat.concat(toFlatten), []);

        this.numberOfLoadedImages = allImages.filter((i) => i.complete).length;
        allImages.filter((i) => !i.complete).forEach((img) => {
          img.onload = () => {
            if (++this.numberOfLoadedImages === allImages.length) {
              this.bsTemplateImagesLoaded.emit();
            }
          };
        });
      }

    } else if (this._viewRef && changes['bsTemplateOutletContext'] && this.bsTemplateOutletContext) {

      this._viewRef.context = this.bsTemplateOutletContext;
      if (this._viewRef) {
        const allImages = this._viewRef?.rootNodes
          .map(node => <HTMLElement>node)
          .map(node => Array.from(node.querySelectorAll('img')))
          .reduce((flat, toFlatten) => flat.concat(toFlatten), []);

        this.numberOfLoadedImages = allImages.filter((i) => i.complete).length;
        console.log(`${this.numberOfLoadedImages} images loaded rightaway`);
        allImages.filter((i) => !i.complete).forEach((img) => {
          img.onloadeddata = () => {
            console.log('load');
            if (++this.numberOfLoadedImages === allImages.length) {
              this.bsTemplateImagesLoaded.emit();
            }
          };
        });
      }
    }
  }
}
