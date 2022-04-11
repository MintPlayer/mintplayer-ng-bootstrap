import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, Renderer2, TemplateRef, ViewChild } from "@angular/core";
import { EnterFromAnimation, EnterFromHostAnimation, FadeInOutAnimation } from "@mintplayer/ng-animations";
import { BehaviorSubject, combineLatest, filter, Subject, takeUntil } from "rxjs";
import { MODAL_BODY } from "../../providers/modal-body.provider";
import { MODAL_FOOTER } from "../../providers/modal-footer.provider";
import { MODAL_HEADER } from "../../providers/modal-header.provider";

@Component({
  selector: 'bs-modal-holder',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  animations: [FadeInOutAnimation, EnterFromHostAnimation, EnterFromAnimation]
})
export class BsModalComponent implements AfterViewInit, OnDestroy {

  constructor(@Inject(MODAL_HEADER) header: TemplateRef<any>, @Inject(MODAL_BODY) body: TemplateRef<any>, @Inject(MODAL_FOOTER) footer: TemplateRef<any>, private renderer: Renderer2) {
    this.header = header;
    this.body = body;
    this.footer = footer;

    combineLatest([this.isViewInited$, this.isOpen$])
      .pipe(filter(([isViewInited, isOpen]) => isViewInited && isOpen))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([isViewInited, isOpen]) => {
        setTimeout(() => {
          // this.renderer.setAttribute(this.modal.nativeElement, 'cdktrapfocus', '');
          // this.modal.nativeElement.setAttribute('cdktrapfocus', '');
        });
      });
  }

  header: TemplateRef<any>;
  body: TemplateRef<any>;
  footer: TemplateRef<any>;

  // isOpen = false;
  @ViewChild('modal') modal!: ElementRef<HTMLDivElement>;

  isViewInited$ = new BehaviorSubject<boolean>(false);
  isOpen$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();
  public get isOpen() {
    return this.isOpen$.value;
  }
  public set isOpen(value: boolean) {
    this.isOpen$.next(value);
  }

  ngAfterViewInit() {
    this.isViewInited$.next(true);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

}
