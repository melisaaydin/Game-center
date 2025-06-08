import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import enFlag from '../assets/en-flag.png';
import trFlag from '../assets/tr-flag.png';
import './LanguageSwitcher.css';
import i18n from '../i18n';

// Defining the LanguageSwitcher component for toggling languages
const LanguageSwitcher = () => {
    // Accessing language context for current language and change function
    const { language, changeLanguage } = useContext(LanguageContext);
    const newLang = language === 'en' ? 'tr' : 'en';
    return (
        <div className="language-switcher" onClick={() => changeLanguage(newLang)}>
            <img
                src={language === 'en' ? enFlag : trFlag}
                alt={language === 'en' ? 'English' : 'Türkçe'}
            />
        </div>
    );
};

// Exporting the LanguageSwitcher component as default
export default LanguageSwitcher;