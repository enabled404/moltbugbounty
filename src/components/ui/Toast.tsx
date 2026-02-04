'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Premium Toast Notification System
// S-Tier UX with animations and auto-dismiss
// ═══════════════════════════════════════════════════════════════

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Toast Icons
const icons: Record<ToastType, ReactNode> = {
    success: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="currentColor" fillOpacity="0.15" />
            <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    error: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="currentColor" fillOpacity="0.15" />
            <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    warning: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="currentColor" fillOpacity="0.15" />
            <path d="M10 6V11M10 14V14.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    info: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="currentColor" fillOpacity="0.15" />
            <path d="M10 9V14M10 6V6.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
};

const colorClasses: Record<ToastType, string> = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    info: 'toast-info',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
    const [isExiting, setIsExiting] = useState(false);

    const handleRemove = useCallback(() => {
        setIsExiting(true);
        setTimeout(onRemove, 200);
    }, [onRemove]);

    // Auto-dismiss
    useState(() => {
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            const timer = setTimeout(handleRemove, duration);
            return () => clearTimeout(timer);
        }
    });

    return (
        <div
            className={`toast ${colorClasses[toast.type]} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
            role="alert"
        >
            <div className="toast-icon">
                {icons[toast.type]}
            </div>
            <div className="toast-content">
                <div className="toast-title">{toast.title}</div>
                {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            {toast.action && (
                <button className="toast-action" onClick={toast.action.onClick}>
                    {toast.action.label}
                </button>
            )}
            <button className="toast-close" onClick={handleRemove} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </button>
            <div className="toast-progress" style={{ animationDuration: `${toast.duration ?? 5000}ms` }} />
        </div>
    );
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        setToasts(prev => [...prev.slice(-4), { ...toast, id }]); // Max 5 toasts
        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = useCallback((title: string, message?: string) => {
        addToast({ type: 'success', title, message });
    }, [addToast]);

    const error = useCallback((title: string, message?: string) => {
        addToast({ type: 'error', title, message, duration: 7000 });
    }, [addToast]);

    const warning = useCallback((title: string, message?: string) => {
        addToast({ type: 'warning', title, message });
    }, [addToast]);

    const info = useCallback((title: string, message?: string) => {
        addToast({ type: 'info', title, message });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
            <div className="toast-container" aria-live="polite">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
