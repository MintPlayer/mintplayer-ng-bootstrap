import { DOCUMENT } from '@angular/common';
import { AfterViewChecked, Directive, DoCheck, EmbeddedViewRef, forwardRef, Inject, OnChanges, OnDestroy, OnInit, Renderer2, SimpleChanges, TemplateRef } from '@angular/core';
import { BsDropdownService } from '../dropdown-service/dropdown.service';
import { Subject, takeUntil } from 'rxjs';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';

@Directive({
  selector: '[bsDropdownMenu]',
  host: {
    '[class.show]': 'dropdown.isOpen'
  }
})
export class BsDropdownMenuDirective implements OnInit, OnDestroy, AfterViewChecked, OnChanges {

  constructor(
    @Inject(forwardRef(() => BsDropdownDirective)) private dropdown: BsDropdownDirective,
    @Inject(DOCUMENT) document: any,
    private renderer: Renderer2,
    private templateRef: TemplateRef<any>,
    private dropdownService: BsDropdownService
  ) {
    this.document = <Document>document;
    this.dropdown.isOpen$.pipe(takeUntil(this.destroyed$))
      .subscribe((isOpen) => {
        if (isOpen) {
          this.insertInDOM();
        } else {
          this.removeFromDOM();
        }
      });
  }

  private document: Document;
  private bodyContainer: HTMLElement | null = null;
  private destroyed$ = new Subject();
  private templateView: EmbeddedViewRef<any> | null = null;

  private insertInDOM() {
    const button = this.dropdown.toggle.toggleButton.nativeElement;

    this.bodyContainer = this.renderer.createElement('div');
    this.renderer.setStyle(this.bodyContainer, 'position', 'absolute');
    this.renderer.setStyle(this.bodyContainer, 'left', button.offsetLeft + 'px');
    this.renderer.setStyle(this.bodyContainer, 'top', parseInt(button.offsetTop + button.offsetHeight) + 'px');
    this.renderer.setStyle(this.bodyContainer, 'width', button.offsetWidth + 'px');
    this.renderer.appendChild(this.document.body, this.bodyContainer);

    if (this.bodyContainer) {
      // const templateView = this.templateRef.createEmbeddedView({ });
      // this.renderer.appendChild(this.bodyContainer, templateView.rootNodes[0]);
      // templateView.detectChanges();

      const templateView = this.dropdownService.ref?.createEmbeddedView(this.templateRef, {});
      this.renderer.setStyle(templateView, 'position', 'absolute');
      this.renderer.setStyle(templateView, 'left', button.offsetLeft + 'px');
      this.renderer.setStyle(templateView, 'top', parseInt(button.offsetTop + button.offsetHeight) + 'px');
      this.renderer.setStyle(templateView, 'width', button.offsetWidth + 'px');
    }
  }

  private removeFromDOM() {
    this.bodyContainer?.remove();
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['bsDropdownMenu']) {
      if (this.templateView) {
        this.removeFromDOM();
        this.insertInDOM();
        this.templateView.detectChanges();
      }
    }

    // if (this.templateView) {
    //   console.log('changes');
    //   this.templateView.detectChanges();
    //   this.templateView.reattach();
    // }
  }

  ngAfterViewChecked() {
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }


}
