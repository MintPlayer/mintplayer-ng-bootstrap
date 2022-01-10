import { Component, forwardRef, HostBinding, Inject, OnInit } from '@angular/core';
import { BsModalComponent } from '../modal/modal.component';
import { BsModalService } from '../../service/modal.service';
import { BsModalPresenterComponent } from '../modal-presenter/modal-presenter.component';

@Component({
  selector: 'bs-modal-header',
  templateUrl: './modal-header.component.html',
  styleUrls: ['./modal-header.component.scss']
})
export class BsModalHeaderComponent implements OnInit {

  constructor(
    private modalService: BsModalService,
    private modal: BsModalComponent,
    // private modalPresenter: BsModalPresenterComponent,
    // @Inject(forwardRef(() => BsModalPresenterComponent)) private modalPresenter: BsModalPresenterComponent
  ) { }
  
  @HostBinding('class.w-100')    
  @HostBinding('class.d-flex')    
  @HostBinding('class.align-items-center')
  private classList = true;    

  closeModal() {
    // this.modalService.hide(this.modalPresenter);
  }

  ngOnInit(): void {
  }
}
