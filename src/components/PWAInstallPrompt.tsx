import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if the app is already installed/running in standalone mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setIsStandalone(true);
      return;
    }

    // Check if the user recently dismissed the prompt (hide for 24 hours)
    const dismissedAt = localStorage.getItem("pwaPromptDismissedAt");
    if (dismissedAt) {
      const now = new Date().getTime();
      const dismissedTime = parseInt(dismissedAt, 10);
      if (now - dismissedTime < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Only show the custom prompt on mobile devices
      if (window.innerWidth <= 768) {
        // Slight delay to not overwhelm the user immediately on page load
        setTimeout(() => setShowPrompt(true), 2500);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember that the user dismissed it so we don't annoy them
    localStorage.setItem("pwaPromptDismissedAt", new Date().getTime().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none sm:hidden">
      {/* Backdrop overlay */}
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto ${showPrompt ? "opacity-100" : "opacity-0"}`} 
        onClick={handleDismiss}
      />
      
      {/* Slide-up Bottom Sheet */}
      <div 
        className={`relative w-full bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-10 pointer-events-auto transition-transform duration-500 ease-out transform ${showPrompt ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Dismiss Button */}
        <button 
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 bg-gray-100/80 rounded-full p-1.5 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        
        <div className="flex items-center gap-4 mb-6">
          <div 
            className="w-16 h-16 flex items-center justify-center rounded-2xl shadow-md shrink-0 border border-slate-100 overflow-hidden"
            style={{ backgroundColor: "var(--navy, #0B1528)" }}
          >
            {/* Try to load the PWA icon, fallback to a local image if it fails */}
            <img 
              src="/icons/icon-192x192.png" 
              alt="Diet By RD App Icon" 
              className="w-full h-full object-cover p-1" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/aryan-bhagat-founder.png"; 
              }} 
            />
          </div>
          <div>
            <h3 className="text-xl font-bold leading-tight" style={{ color: "var(--navy, #0B1528)" }}>Install Diet By RD</h3>
            <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">
              Faster access, offline features, and a seamless premium experience.
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleInstallClick}
          className="w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-transform text-base"
          style={{ backgroundColor: "var(--teal, #0b6e4f)" }}
        >
          <Download size={20} strokeWidth={2.5} />
          Install App Now
        </button>
      </div>
    </div>
  );
}
