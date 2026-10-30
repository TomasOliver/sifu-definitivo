import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from './modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-modal.component.html',
  styleUrl: './app-modal.component.css',
})
export class AppModalComponent {
  protected readonly modalService = inject(ModalService);
  protected readonly modal = this.modalService.activeModal;

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.modal()) {
      this.onCancel();
    }
  }

  onConfirm() {
    this.modalService.resolveModal(true);
  }

  onCancel() {
    const current = this.modal();
    if (!current) return;
    this.modalService.resolveModal(false);
  }
}
