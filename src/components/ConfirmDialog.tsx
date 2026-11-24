import { useEffect, useRef } from 'react';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Abbrechen',
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    cancelRef.current?.focus();

    const dismiss = () => onCancelRef.current();
    const onNativeCancel = (event: Event) => {
      event.preventDefault();
      dismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
      }
    };
    const onBackdrop = (event: MouseEvent) => {
      if (event.target === event.currentTarget) dismiss();
    };
    dialog.addEventListener('cancel', onNativeCancel);
    dialog.addEventListener('keydown', onKey);
    dialog.addEventListener('click', onBackdrop);
    return () => {
      dialog.removeEventListener('cancel', onNativeCancel);
      dialog.removeEventListener('keydown', onKey);
      dialog.removeEventListener('click', onBackdrop);
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="confirm" aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      <div className="confirm-actions">
        <button ref={cancelRef} type="button" className="btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
