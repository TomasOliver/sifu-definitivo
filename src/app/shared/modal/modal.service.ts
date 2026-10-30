import { Injectable, signal } from '@angular/core';

export type ModalVariant = 'info' | 'success' | 'warning' | 'error' | 'danger';

export interface ModalConfig {
  mode: 'alert' | 'confirm';
  title: string;
  message: string;
  variant: ModalVariant;
  confirmText: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  readonly activeModal = signal<ModalConfig | null>(null);
  private resolver: ((result: boolean) => void) | null = null;

  alert(options: {
    title: string;
    message: string;
    variant?: ModalVariant;
    confirmText?: string;
  }): Promise<void> {
    if (this.resolver) {
      this.resolver(false);
      this.resolver = null;
    }

    this.activeModal.set({
      mode: 'alert',
      title: options.title,
      message: options.message,
      variant: options.variant ?? 'info',
      confirmText: options.confirmText ?? 'Aceptar',
    });

    return new Promise<void>((resolve) => {
      this.resolver = () => resolve();
    });
  }

  confirm(options: {
    title: string;
    message: string;
    variant?: ModalVariant;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    if (this.resolver) {
      this.resolver(false);
      this.resolver = null;
    }

    this.activeModal.set({
      mode: 'confirm',
      title: options.title,
      message: options.message,
      variant: options.variant ?? 'warning',
      confirmText: options.confirmText ?? 'Confirmar',
      cancelText: options.cancelText ?? 'Cancelar',
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  resolveModal(accepted: boolean): void {
    const fn = this.resolver;
    this.resolver = null;
    this.activeModal.set(null);
    if (fn) {
      fn(accepted);
    }
  }
}
