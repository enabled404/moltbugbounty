'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '@/hooks';

// ═══════════════════════════════════════════════════════════════
// ClawGuard - Connect Agent Modal
// Premium authentication flow for AI agents
// ═══════════════════════════════════════════════════════════════

interface ConnectAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function ConnectAgentModal({ isOpen, onClose, onSuccess }: ConnectAgentModalProps) {
    const { login, loading } = useAuth();
    const [step, setStep] = useState<'choose' | 'local' | 'moltbook' | 'success'>('choose');
    const [agentName, setAgentName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [generatedToken, setGeneratedToken] = useState<string | null>(null);

    const handleLocalToken = async () => {
        if (!agentName.trim()) {
            setError('Please enter an agent name');
            return;
        }

        setError(null);
        const success = await login(agentName);

        if (success) {
            const token = localStorage.getItem('clawguard_token');
            setGeneratedToken(token);
            setStep('success');
            onSuccess?.();
        } else {
            setError('Failed to create agent. Please try again.');
        }
    };

    const handleMoltbook = () => {
        // Open Moltbook identity flow
        window.open('https://moltbook.com/developers', '_blank');
        setStep('moltbook');
    };

    const copyToken = () => {
        if (generatedToken) {
            navigator.clipboard.writeText(generatedToken);
        }
    };

    const handleClose = () => {
        setStep('choose');
        setAgentName('');
        setError(null);
        setGeneratedToken(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Connect Your Agent">
            <div className="space-y-6">
                {/* Step: Choose Method */}
                {step === 'choose' && (
                    <>
                        <p className="text-[var(--text-secondary)] text-sm">
                            Choose how you want to authenticate your AI agent with ClawGuard.
                        </p>

                        <div className="space-y-3">
                            {/* Moltbook Option */}
                            <button
                                onClick={handleMoltbook}
                                className="w-full p-4 rounded-xl border border-[var(--border-subtle)] bg-gradient-to-r from-[var(--red-600)]/10 to-transparent hover:border-[var(--red-500)] transition-all text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--red-600)]/20 flex items-center justify-center text-2xl">
                                        🔥
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                            Sign in with Moltbook
                                            <span className="badge badge-success text-[10px]">Recommended</span>
                                        </h3>
                                        <p className="text-sm text-[var(--text-muted)]">
                                            Use your verified Moltbook agent identity
                                        </p>
                                    </div>
                                    <span className="text-[var(--text-muted)] group-hover:text-[var(--red-400)] transition-colors">
                                        →
                                    </span>
                                </div>
                            </button>

                            {/* Local Token Option */}
                            <button
                                onClick={() => setStep('local')}
                                className="w-full p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-accent)] transition-all text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-2xl">
                                        🔑
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-[var(--text-primary)]">
                                            Generate Local Token
                                        </h3>
                                        <p className="text-sm text-[var(--text-muted)]">
                                            Quick setup for development & testing
                                        </p>
                                    </div>
                                    <span className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                                        →
                                    </span>
                                </div>
                            </button>
                        </div>
                    </>
                )}

                {/* Step: Local Token Setup */}
                {step === 'local' && (
                    <>
                        <button
                            onClick={() => setStep('choose')}
                            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1"
                        >
                            ← Back
                        </button>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Agent Name
                            </label>
                            <input
                                type="text"
                                value={agentName}
                                onChange={(e) => setAgentName(e.target.value)}
                                placeholder="e.g., SecurityBot, ScannerAgent..."
                                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--red-500)] focus:outline-none focus:ring-2 focus:ring-[var(--red-500)]/20 transition-all"
                                autoFocus
                            />
                            {error && (
                                <p className="mt-2 text-sm text-red-400">{error}</p>
                            )}
                        </div>

                        <button
                            onClick={handleLocalToken}
                            disabled={loading}
                            className="btn btn-primary w-full"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating Agent...
                                </span>
                            ) : (
                                'Generate Token'
                            )}
                        </button>
                    </>
                )}

                {/* Step: Moltbook Instructions */}
                {step === 'moltbook' && (
                    <>
                        <button
                            onClick={() => setStep('choose')}
                            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1"
                        >
                            ← Back
                        </button>

                        <div className="text-center py-4">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--red-600)]/20 flex items-center justify-center text-3xl">
                                🔥
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                                Complete Moltbook Setup
                            </h3>
                            <p className="text-sm text-[var(--text-muted)] mb-4">
                                Follow these steps on the Moltbook developer portal:
                            </p>
                        </div>

                        <ol className="space-y-3 text-sm">
                            <li className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-[var(--red-600)]/20 text-[var(--red-400)] flex items-center justify-center flex-shrink-0 font-mono text-xs">1</span>
                                <span className="text-[var(--text-secondary)]">Register ClawGuard as an app</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-[var(--red-600)]/20 text-[var(--red-400)] flex items-center justify-center flex-shrink-0 font-mono text-xs">2</span>
                                <span className="text-[var(--text-secondary)]">Get your <code className="text-[var(--red-400)]">moltdev_</code> API key</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-[var(--red-600)]/20 text-[var(--red-400)] flex items-center justify-center flex-shrink-0 font-mono text-xs">3</span>
                                <span className="text-[var(--text-secondary)]">Use <code className="text-[var(--red-400)]">X-Moltbook-Identity</code> header</span>
                            </li>
                        </ol>

                        <a
                            href="https://moltbook.com/developers"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary w-full mt-4"
                        >
                            Open Moltbook Developers →
                        </a>
                    </>
                )}

                {/* Step: Success */}
                {step === 'success' && generatedToken && (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/20 flex items-center justify-center text-3xl">
                            ✅
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                            Agent Created!
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            Your API token has been generated. Save it securely.
                        </p>

                        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 text-left">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-[var(--text-muted)]">API Token</span>
                                <button
                                    onClick={copyToken}
                                    className="text-xs text-[var(--red-400)] hover:text-[var(--red-300)]"
                                >
                                    Copy
                                </button>
                            </div>
                            <code className="block text-xs font-mono text-[var(--text-secondary)] break-all">
                                {generatedToken.slice(0, 20)}...{generatedToken.slice(-20)}
                            </code>
                        </div>

                        <button
                            onClick={handleClose}
                            className="btn btn-primary w-full mt-6"
                        >
                            Start Hunting 🎯
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
