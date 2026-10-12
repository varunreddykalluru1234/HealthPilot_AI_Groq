import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// ─── Global Translation Crash Guard ──────────────────────────────────────────
// Prevents React 18 reconciliation crashes (e.g. removeChild / insertBefore)
// caused by external DOM translation (Google Translate wrapping text in <font>).
if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode !== this) {
      if (child.parentNode) {
        try {
          return child.parentNode.removeChild(child);
        } catch {
          return child;
        }
      }
      return child;
    }
    return originalRemoveChild.call(this, child);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (referenceNode && referenceNode.parentNode) {
        try {
          return originalInsertBefore.call(referenceNode.parentNode, newNode, referenceNode);
        } catch {
          return originalInsertBefore.call(this, newNode, null);
        }
      }
      return originalInsertBefore.call(this, newNode, null);
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
