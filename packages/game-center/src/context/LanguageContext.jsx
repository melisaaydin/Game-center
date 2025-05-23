import React, { createContext, useState, useEffect } from 'react';
import i18n, { setUserLanguage } from '../i18n';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(localStorage.getItem('i18nextLng') || 'en');

    const changeLanguage = (lng) => {
        if (lng !== language && ['en', 'tr'].includes(lng)) {
            console.log('LanguageContext: Changing language to:', lng);
            setLanguage(lng);
            setUserLanguage(lng);
        }
    };

    useEffect(() => {
        if (language !== i18n.language) {
            setUserLanguage(language);
        }
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, changeLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};