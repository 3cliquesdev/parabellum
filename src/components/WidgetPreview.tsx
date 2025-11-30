import { MessageCircle, X, Mail, Phone, Ticket } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WidgetPreviewProps {
  config: {
    color: string;
    position: "right" | "left";
    greeting: string;
    department: string;
    logo: string;
    showWhatsApp: boolean;
    showTicket: boolean;
  };
}

export default function WidgetPreview({ config }: WidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = config.position === "right" ? "right-6" : "left-6";

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg relative overflow-hidden">
      {/* Fake Website Content */}
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded w-full"></div>
            <div className="h-4 bg-slate-100 rounded w-5/6"></div>
            <div className="h-4 bg-slate-100 rounded w-4/6"></div>
          </div>
        </div>
        <div className="text-center mt-8 text-slate-400 text-sm">
          Seu Site Aqui
        </div>
      </div>

      {/* Widget Button */}
      <motion.button
        className={`fixed bottom-6 ${positionClasses} rounded-full shadow-2xl p-4 hover:scale-110 transition-transform z-50`}
        style={{ backgroundColor: config.color }}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </motion.button>

      {/* Greeting Tooltip */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: config.position === "right" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: config.position === "right" ? 20 : -20 }}
            className={`fixed bottom-24 ${positionClasses} bg-white rounded-lg shadow-lg p-3 text-sm font-medium text-slate-700 z-40`}
          >
            {config.greeting}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className={`fixed bottom-24 ${positionClasses} bg-white rounded-lg shadow-2xl w-80 z-40 overflow-hidden`}
          >
            {/* Header */}
            <div
              className="p-4 text-white"
              style={{ backgroundColor: config.color }}
            >
              <div className="flex items-center gap-3">
                {config.logo ? (
                  <img src={config.logo} alt="Logo" className="h-10 w-10 rounded-full bg-white p-1" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">Como podemos ajudar?</h3>
                  <p className="text-xs opacity-90">Escolha um canal</p>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="p-2">
              {config.showWhatsApp && (
                <button className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">WhatsApp</p>
                    <p className="text-xs text-slate-500">Resposta rápida</p>
                  </div>
                </button>
              )}

              <button className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <MessageCircle className="h-5 w-5" style={{ color: config.color }} />
                </div>
                <div>
                  <p className="font-medium text-sm">Chat ao Vivo</p>
                  <p className="text-xs text-slate-500">Fale com nossa equipe</p>
                </div>
              </button>

              {config.showTicket && (
                <button className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Abrir Ticket</p>
                    <p className="text-xs text-slate-500">Suporte técnico</p>
                  </div>
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50 text-center">
              <p className="text-xs text-slate-400">
                Powered by <span className="font-semibold">Parabellum</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
