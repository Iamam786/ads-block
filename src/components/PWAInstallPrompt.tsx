"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed / running in standalone mode
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      if (isStandaloneMode) return;

      const handleBeforeInstallPrompt = (e: Event) => {
        // Prevent default mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        setDeferredPrompt(e);

        // Check if user dismissed it recently in this session
        const dismissed = sessionStorage.getItem("pwa-prompt-dismissed");
        if (!dismissed) {
          // Show after brief delay for smooth entrance
          setTimeout(() => setShowPrompt(true), 1500);
        }
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      // Expose trigger globally so header install button can invoke it
      (window as any).triggerPWAInstall = () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === "accepted") {
              setShowPrompt(false);
            }
            setDeferredPrompt(null);
          });
        } else {
          alert("To install, tap your browser's menu (⋮ or share icon) and select 'Install app' or 'Add to Home screen'.");
        }
      };

      const handleAppInstalled = () => {
        setIsStandalone(true);
        setShowPrompt(false);
        setDeferredPrompt(null);
      };

      window.addEventListener("appinstalled", handleAppInstalled);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("To install, tap your browser's menu (⋮) and select 'Install app' or 'Add to Home screen'.");
      return;
    }

    // Show native Android install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pwa-prompt-dismissed", "true");
    }
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-card/95 backdrop-blur-md border border-primary/30 shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-3 text-card-foreground">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
            <img
              src="/icons/icon-96x96.png"
              alt="Yt Block App"
              className="h-9 w-9 rounded-lg object-contain"
              onError={(e) => {
                // Fallback to icon
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <Smartphone className="h-6 w-6 text-primary hidden only:block" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-sm">
              <span>Install Yt Block App</span>
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              Ad-free playback & lock-screen audio on your phone
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
