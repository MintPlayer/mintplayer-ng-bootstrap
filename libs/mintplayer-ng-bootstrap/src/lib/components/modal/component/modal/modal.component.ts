import { Component, TemplateRef } from "@angular/core";

@Component({
  selector: 'bs-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class BsModalComponent {

  constructor() {}

  header!: TemplateRef<any>;
  body!: TemplateRef<any>;
  footer!: TemplateRef<any>;

}
