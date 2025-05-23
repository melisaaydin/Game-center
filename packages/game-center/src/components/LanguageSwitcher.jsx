import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import enFlag from '../assets/en-flag.png';
import trFlag from '../assets/tr-flag.png';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
    const { language, changeLanguage } = useContext(LanguageContext);

    const toggleLanguage = () => {
        const newLanguage = language === 'en' ? 'tr' : 'en';
        console.log('LanguageSwitcher: Changing to:', newLanguage);
        changeLanguage(newLanguage);
    };

    const flagSrc = language === 'en' ? enFlag : trFlag;

    return (
        <div className="language-switcher" onClick={toggleLanguage}>
            <img
                src={flagSrc}
                alt={language === 'en' ? 'English' : 'Türkçe'}
                onError={(e) => console.warn(`Flag failed to load: ${flagSrc}`)}
            />
        </div>
    );
};

export default LanguageSwitcher;