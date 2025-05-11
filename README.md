## 🏗️ Proje Mimarisi

Projeyi katmanlı bir yapıda kurguladım. Kullanıcıdan veritabanına kadar olan iletişim şu şekilde tasarlandı:

```
End User → Frontend → Backend → Database
```

Bu yapı sayesinde kodların yönetimi, hata ayıklama ve geliştirme süreçleri çok daha kolay hale geldi.

---
## 🧰 Kullanılan Teknolojiler

Bu projede hem frontend hem de backend tarafında modern teknolojiler kullandım:

### 🖥️ Frontend:
- React
- JavaScript (ES6+)
- Lerna (çoklu paket yapısı)
- React Router

### 🗄️ Backend:
- Node.js
- Express.js
- PostgreSQL

### ⚙️ Diğer:
- Middleware yapıları
- Git & GitHub (versiyon kontrol)
- dotenv (çevresel değişken yönetimi)

---

## 🎨 Uygulama Özellikleri

Bu projede aşağıdaki ekran ve bölümleri geliştirdim:

- **Tema**: Pembe ve mavi renklerde sade, modern bir arayüz
- **Giriş Ekranı**: Kullanıcı kimlik doğrulama
- **Ana Ekran**: Oyunlar ve hızlı erişim
- **Oyun Detay Ekranı**: Seçilen oyun hakkında bilgiler
- **Lobi Detay Sayfası**: Lobi ayarları ve kullanıcı listesi
- **Profil Ayarları ve Detay**: Kullanıcı bilgilerini görme ve düzenleme
- **Arkadaşlar Sayfası**: Sosyal bağlantılar

Kullanıcı deneyimi odaklı, sade ama kullanışlı bir yapı oluşturmaya çalıştım.

---

## 🧩 Middleware Ne İçin Kullanıldı?

Middleware katmanını aşağıdaki amaçlarla aktif olarak kullandım:

- İstek ve yanıtların manipülasyonu
- Ortak işlevlerin merkezi hale getirilmesi
- Kodun modülerliğinin artırılması
- Yetkilendirme ve güvenlik kontrolleri
- Hata yönetimi

Bu sayede backend tarafında kod okunabilirliği ve yönetimi çok daha verimli hale geldi.

---
##  🎨 Uygulamaya Ait Görseller

![Ekran görüntüsü 2025-04-24 204810](https://github.com/user-attachments/assets/c96bb365-b102-4b54-bd04-1fa02a3e92b4)

![Ekran görüntüsü 2025-04-24 204251](https://github.com/user-attachments/assets/a2b85058-c518-4ddd-b7b6-5ebe475695c4)

## 📚 Git ve Sürüm Kontrolü

Proje sürecinde Git ile sürüm kontrolünü sağladım. Her yeni özellik ya da düzenleme için anlamlı commit mesajları kullanarak süreci dokümante ettim. Geriye dönük takip ve kod yönetimi açısından bu oldukça faydalı oldu.

---

## 🚀 Projeyi Çalıştırmak İçin

Projeyi kendi bilgisayarınızda çalıştırmak isterseniz:

1. Bu repoyu klonlayın:
   ```bash
   git clone https://github.com/melisaaydin/Game-center.git
   cd Game-center
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. `.env` dosyasını oluşturup gerekli çevresel değişkenleri girin.

4. Uygulamayı başlatın:
   ```bash
   npm run dev
   ```
   
5. Uygulamaya giriş yapmak için aşağıdaki hesap bilgilerini kullanabilirsiniz:

E-mail: deneme@gmail.com

Şifre: Deneme123

---
