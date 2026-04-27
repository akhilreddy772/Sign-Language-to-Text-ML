import React, { useState } from 'react';
import { X, Settings, Palette, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGES, THEMES } from '../config/languages';

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, theme, t, changeLanguage, changeTheme, getTheme } = useLanguage();
  const currentTheme = getTheme();

  return (
    <>
      {/* Settings Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`p-3 rounded-lg ${currentTheme.card} border ${currentTheme.border} transition-all`}
        title={t('settings')}
      >
        <Settings size={24} className={currentTheme.text} />
      </motion.button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 flex items-start justify-center overflow-hidden p-4 pt-20"
            onClick={() => setIsOpen(false)}
          >
            {/* Settings Panel */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${currentTheme.card} border ${currentTheme.border} rounded-xl p-4 max-w-md w-full max-h-[70vh] overflow-y-auto shadow-2xl`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${currentTheme.text} flex items-center gap-2`}>
                  <Settings size={24} />
                  {t('settings')}
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1 rounded-lg ${currentTheme.hover} transition-all`}
                >
                  <X size={24} className={currentTheme.text} />
                </button>
              </div>

              {/* Language Section */}
              <div className="mb-5">
                <label className={`flex items-center gap-2 text-base font-semibold ${currentTheme.text} mb-2`}>
                  <Globe size={20} />
                  {t('language')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(LANGUAGES).map(([code, lang]) => (
                    <motion.button
                      key={code}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => changeLanguage(code)}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        language === code
                          ? `border-blue-500 bg-blue-500/20 ${currentTheme.text}`
                          : `border ${currentTheme.border} ${currentTheme.text} ${currentTheme.hover}`
                      }`}
                    >
                      <div className="text-xl mb-1">{lang.flag}</div>
                      <div className="text-sm font-medium">{lang.name}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Theme Section */}
              <div>
                <label className={`flex items-center gap-2 text-base font-semibold ${currentTheme.text} mb-2`}>
                  <Palette size={20} />
                  {t('theme')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(THEMES).map(([themeName, themeConfig]) => (
                    <motion.button
                      key={themeName}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => changeTheme(themeName)}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        theme === themeName
                          ? `border-blue-500 bg-blue-500/20 ${currentTheme.text}`
                          : `border ${currentTheme.border} ${currentTheme.text} ${currentTheme.hover}`
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-4 h-4 rounded-full ${themeConfig.accent}`}></div>
                      </div>
                      <div className="text-sm font-medium">{themeConfig.name}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(false)}
                className="w-full mt-4 py-2 rounded-lg bg-blue-500 text-white font-semibold transition-all hover:bg-blue-600"
              >
                {t('close')}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
