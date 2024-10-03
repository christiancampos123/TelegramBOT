// Importar dotenv para manejar variables de entorno
require('dotenv').config();

const TelegramService = require('./services/telegramService'); // Ajusta la ruta según sea necesario

// Iniciar el servicio de Telegram
const telegramService = new TelegramService();