
import CryptoJS from "crypto-js";

const SECRET_KEY = "mySecretKey123!"; // Güvenli bir anahtar kullanın

// Kullanıcı bilgilerini şifrele
export const encryptUserData = (userData) => {
    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(userData), SECRET_KEY).toString();
    localStorage.setItem("rememberedUser", encryptedData);
};

// Şifrelenmiş veriyi çöz ve geri dön
export const decryptUserData = () => {
    const encryptedData = localStorage.getItem("rememberedUser");
    if (!encryptedData) return null;

    // Şifrelenmiş veriyi çöz
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8); // UTF-8 olarak çözülmüş veri

    // JSON'a çevir ve döndür
    return decryptedData ? JSON.parse(decryptedData) : null;
};
