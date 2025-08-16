// Perbarui config.js
window.API_CONFIG = {
    BASE_URL: 'http://192.168.100.236/prototipe/api',
};

// Arduino ESP8266 Configuration
window.ARDUINO_IP = '192.168.100.30'; // Alamat IP Arduino yang terdeteksi

// Store in localStorage as fallback
localStorage.setItem('arduino_ip', window.ARDUINO_IP);