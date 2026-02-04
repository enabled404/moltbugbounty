'use client';

import { useEffect, useRef, ReactNode, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Premium Modal Component
// S-Tier dialog with backdrop blur, animations, and accessibility
// ═══════════════════════════════════════════════════════════════

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    footer?: ReactNode;
}

const sizeClasses = {
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg',
    xl: 'modal-xl',
    full: 'modal-full',
};

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnBackdrop = true,
    closeOnEscape = true,
    footer,
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    // Handle escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (closeOnEscape && e.key === 'Escape') {
            onClose();
        }
    }, [closeOnEscape, onClose]);

    // Handle backdrop click
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose();
        }
    }, [closeOnBackdrop, onClose]);

    // Focus trap and restoration
    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement as HTMLElement;
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';

            // Focus first focusable element
            setTimeout(() => {
                const focusable = modalRef.current?.querySelector(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                ) as HTMLElement;
                focusable?.focus();
            }, 100);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            previousActiveElement.current?.focus();
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal="true">
            <div
                ref={modalRef}
                className={`modal ${sizeClasses[size]}`}
                role="document"
            >
                {(title || showCloseButton) && (
                    <div className="modal-header">
                        {title && <h2 className="modal-title">{title}</h2>}
                        {showCloseButton && (
                            <button
                                className="modal-close"
                                onClick={onClose}
                                aria-label="Close modal"
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                <div className="modal-body">
                    {children}
                </div>

                {footer && (
                    <div className="modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

// Confirmation modal helper
interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'primary';
    loading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'primary',
    loading = false,
}: ConfirmModalProps) {
    const buttonClass = {
        danger: 'btn-danger',
        warning: 'btn-warning',
        primary: 'btn-primary',
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
                        {cancelLabel}
                    </button>
                    <button
                        className={`btn ${buttonClass[variant]}`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="btn-loading">
                                <span className="spinner" />
                                Processing...
                            </span>
                        ) : confirmLabel}
                    </button>
                </div>
            }
        >
            <p className="modal-message">{message}</p>
        </Modal>
    );
}
