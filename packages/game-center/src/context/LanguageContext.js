import { createContext, useState, useEffect } from 'react';
import i18n from '../i18n';

// Creating a context for language management
export const LanguageContext = createContext();

// Defining the LanguageProvider component to manage language state
export const LanguageProvider = ({ children }) => {
    // Storing the current language, defaulting to i18n's language or 'en'
    const [language, setLanguage] = useState(i18n.language || 'en');

    // Changing the application language and updating storage
    const changeLanguage = (lng) => {
        if (lng && lng !== i18n.language) {
            i18n.changeLanguage(lng)
                .then(() => {
                    localStorage.setItem('i18nextLng', lng);
                    setLanguage(lng);
                    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lng } }));
                })
                .catch((err) => console.error('LanguageContext: Error changing language:', err));
        }
    };

    // Listening for i18n language changes and updating state
    useEffect(() => {
        const handleI18nLanguageChange = () => {
            const newLang = i18n.language;
            setLanguage(newLang);
        };

        i18n.on('languageChanged', handleI18nLanguageChange);
        return () => {
            i18n.off('languageChanged', handleI18nLanguageChange);
        };
    }, []);

    // Syncing language from local storage on changes
    useEffect(() => {
        const syncFromStorage = () => {
            const lng = localStorage.getItem('i18nextLng');
            if (lng && lng !== language) {
                i18n.changeLanguage(lng);
                setLanguage(lng);
            }
        };

        window.addEventListener('storage', syncFromStorage);
        return () => {
            window.removeEventListener('storage', syncFromStorage);
        };
    }, [language]);

    // Providing language context to child components
    return (
        <LanguageContext.Provider value={{ language, changeLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};