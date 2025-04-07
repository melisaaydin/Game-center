
import CryptoJS from "crypto-js";

const SECRET_KEY = "mySecretKey123!";
export const encryptUserData = (userData) => {
    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(userData), SECRET_KEY).toString();
    localStorage.setItem("rememberedUser", encryptedData);
};

export const decryptUserData = () => {
    const encryptedData = localStorage.getItem("rememberedUser");
    if (!encryptedData) return null;

    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedData ? JSON.parse(decryptedData) : null;
};
