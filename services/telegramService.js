// Importar dotenv para manejar variables de entorno
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api'); // Asegúrate de tener esta dependencia
const WallapopScraper = require('./wallapopScraper'); // Verifica que esta línea esté correcta

// Clase TelegramService
class TelegramService {
  constructor() {
    // Reemplaza el valor con el token de Telegram que recibes de @BotFather
    this.token = process.env.telegramToken;
    this.bot = new TelegramBot(this.token, { polling: true }); // Cambiar a true para escuchar mensajes

    // Enviar mensaje de inicio directamente al chat
    this.sendStartupMessage();

    // Mapa de IDs a URLs
    this.urlMap = {
      game_boy: "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=game%20boy&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
      play_station_3: "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=play%20station%203&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
      nintendo_ds: "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=nintendo%20ds&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
      play_station_4: "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=play%20station%204&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
      ds: "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=ds&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
    };

    // Configurar el manejador para el comando /saluda
    this.bot.onText(/\/saluda/, async (msg) => {
      const chatId = msg.chat.id; // Obtener el ID del chat
      await this.sendMessage(chatId, "¡Hola! ¿Cómo estás?"); // Responder al saludo
    });

    this.bot.on('message', async (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        const chatId = msg.chat.id; // Obtener el ID del chat
        await this.sendMessage(chatId, "No te entiendo, usa /ayuda para usar comandos que si entiendo.");
      }
    });

    this.bot.onText(/\/ayuda/, async (msg) => {
      const chatId = msg.chat.id; // Obtener el ID del chat
      await this.sendMessage(chatId, `Lista de comandos:
      ✨ Aquí tienes la lista de comandos ✨


      🔧 /ayuda •••••••• Comando para sacar la ayuda      
      🌐 /scrapurl ••••• Para pasarle una URL para scrapear  
      🛠️ /scrap •••••••• Despliega opciones para scrapear    
      👋 /saluda ••••••• Para saludar al usuario            

      
      😊 ¡Escribeme! Estoy aquí para ayudarte. 😊
      
      `); // Responder al saludo
    });

    // Configurar el manejador para el comando /scrap
    this.bot.onText(/\/scrap/, async (msg) => {
      const chatId = msg.chat.id; // Obtener el ID del chat

      // Configurar los botones con sus IDs
      const urlButtons = [
        { text: "Game Boy", id: "game_boy" },
        { text: "Play Station 3", id: "play_station_3" },
        { text: "Nintendo Ds", id: "nintendo_ds" },
        { text: "Play Station 4", id: "play_station_4" },
        { text: "DS", id: "ds" },
      ];

      // Crear botones con callback_data
      const buttons = [
        [
          { text: urlButtons[0].text, callback_data: urlButtons[0].id },
          { text: urlButtons[1].text, callback_data: urlButtons[1].id }
        ],
        [
          { text: urlButtons[2].text, callback_data: urlButtons[2].id },
          { text: urlButtons[3].text, callback_data: urlButtons[3].id }
        ],
        [
          { text: urlButtons[4].text, callback_data: urlButtons[4].id }
        ]
      ];

      // Enviar mensaje con los botones
      await this.bot.sendMessage(chatId, "Selecciona un anuncio para hacer scraping:", {
        reply_markup: {
          inline_keyboard: buttons
        }
      });
    });

    // Configurar el manejador para los botones
    this.bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const selectedId = callbackQuery.data; // El ID asociado al botón presionado
      const urlToScrap = this.urlMap[selectedId]; // Obtener la URL correspondiente

      await this.sendMessage(chatId, "Iniciando el proceso de scraping...");

      // Ejecutar el scraping de la URL
      try {
        const result = await WallapopScraper.scrapeUrl(urlToScrap);
        const formattedMessage = this.formatScrapingResults(result);
        await this.sendMessage(chatId, formattedMessage);
      } catch (error) {
        await this.sendMessage(chatId, `Error al ejecutar el scraping: ${error.message}`);
      }
    });

    // Configurar el manejador para el comando /scrapurl
    this.bot.onText(/\/scrapurl (.+)/, async (msg, match) => {
      const chatId = msg.chat.id; // Obtener el ID del chat
      const urlToScrap = match[1]; // Obtener la URL pasada como argumento

      await this.sendMessage(chatId, "Iniciando el proceso de scraping...");

      // Ejecutar el scraping de la URL
      try {
        const result = await WallapopScraper.scrapeUrl(urlToScrap);
        const formattedMessage = this.formatScrapingResults(result);
        await this.sendMessage(chatId, formattedMessage);
      } catch (error) {
        await this.sendMessage(chatId, `Error al ejecutar el scraping: ${error.message}`);
      }
    });
  }

  // Método para enviar un mensaje
  async sendMessage(chatId, message) {
    try {
      await this.bot.sendMessage(chatId, message);
      console.log('Mensaje enviado:', message);
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
    }
  }

  // Método para enviar mensaje de inicio
  async sendStartupMessage() {
    const chatId = process.env.chatId; // Asegúrate de que chatId esté en tu archivo .env
    await this.sendMessage(chatId, "¡Hey, estoy listo para las instrucciones!");
  }

  // Método para formatear los resultados del scraping
  formatScrapingResults(results) {
    if (!Array.isArray(results) || results.length === 0) {
      return "No se encontraron resultados.";
    }

    return results.map(item => {
      return `**TITULO:** ${item.title}\n**PRECIO:** ${item.price}\n**DESCRIPCION:** ${item.description}\n**URL:** ${item.url}\n`;
    }).join("\n");
  }
}

// Exportar el servicio para usarlo en otros módulos
module.exports = TelegramService;
