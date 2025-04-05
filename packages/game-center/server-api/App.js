import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
    const [dbTime, setDbTime] = useState('');

    useEffect(() => {
        // API'den veritabanı zamanını al
        axios.get('http://localhost:8081/api/test')
            .then(response => {
                setDbTime(response.data[0].now);  // PostgreSQL'ün verdiği zamanı al
            })
            .catch(error => {
                console.error('Veritabanına bağlanırken hata oluştu:', error);
            });
    }, []);

    return (
        <div>
            <h1>PostgreSQL Bağlantı Testi</h1>
            {dbTime ? (
                <p>Veritabanı Zamanı: {dbTime}</p>
            ) : (
                <p>Veritabanı ile bağlantı kurulamadı.</p>
            )}
        </div>
    );
}

export default App;
