require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const WallapopScraper = require('./wallapopScraper');
const TicTacToeGame = require('./tictactoeGame'); // Importar la clase del juego

class TelegramService {
  constructor() {
    this.token = process.env.telegramToken;
    this.bot = new TelegramBot(this.token, { polling: true });

    // Mapa de juegos activos por chatId
    this.games = {};

    // Array para almacenar chatIds de usuarios
    this.chatIds = [];

    // Enviar mensaje de inicio directamente al chat
    this.sendStartupMessage();

    this.urlMap = {
      // Mapa de URLs de scraping
      game_boy: "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=game%20boy&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
      play_station_3: "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=play%20station%203&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
      nintendo_ds: "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=nintendo%20ds&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
      play_station_4: "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=play%20station%204&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
      ds: "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=ds&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
    };

    this.bot.onText(/\/saluda/, async (msg) => {
      const chatId = msg.chat.id; // Obtener el ID del chat
      await this.sendMessage(chatId, "¡Hola! ¿Cómo estás?"); // Responder al saludo
    });

    this.bot.onText(/\/ayuda/, async (msg) => {
      const chatId = msg.chat.id; // Obtener el ID del chat
      await this.sendMessage(chatId, `Lista de comandos:
      ✨ Aquí tienes la lista de comandos ✨


      🔧 /ayuda •••••••• Comando para sacar la ayuda      
      🌐 /urlscrap ••••• Para pasarle una URL para scrapear  
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

    // Configurar el manejador para el comando /tictactoe
    this.bot.onText(/\/tictactoe/, async (msg) => {
      const chatId = msg.chat.id;

      // Crear un nuevo juego para el chatId actual
      if (!this.games[chatId]) {
        this.games[chatId] = new TicTacToeGame(this.bot, chatId);
        await this.bot.sendMessage(chatId, '¡Nuevo juego de tres en raya iniciado!');
        this.games[chatId].displayBoard();
      } else {
        await this.bot.sendMessage(chatId, 'Ya hay un juego en progreso. Finaliza antes de iniciar otro.');
      }
    });

    // Configurar el manejador para los movimientos del tres en raya
    this.bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      // Verificar si el callback pertenece a un movimiento del tres en raya
      if (data.startsWith('move') && this.games[chatId]) {
        const [action, row, col] = data.split('_');
        this.games[chatId].makeMove(parseInt(row), parseInt(col));
        return; // Salir del callback para evitar que continúe con el flujo de scraping
      }

      // Manejar las opciones de reinicio y salida del juego tres en raya
      if (this.games[chatId] && (data === 'restart_game' || data === 'exit_game')) {
        if (data === 'restart_game') {
          this.games[chatId].resetBoard(); // Reiniciar el tablero
          this.games[chatId].displayBoard(); // Mostrar el nuevo tablero
        } else if (data === 'exit_game') {
          await this.bot.sendMessage(chatId, 'Gracias por jugar. ¡Hasta la próxima!');
          delete this.games[chatId]; // Eliminar el juego activo para este chatId
        }
        return; // Salir del callback para evitar que continúe con el flujo de scraping
      }

      // Si el callback no pertenece a tres en raya, procesar como scraping
      if (this.urlMap[data]) {
        const urlToScrap = this.urlMap[data];
        await this.sendMessage(chatId, "Iniciando el proceso de scraping...");
        try {
          const result = await WallapopScraper.scrapeUrl(urlToScrap);
          const formattedMessage = this.formatScrapingResults(result);
          await this.sendMessage(chatId, formattedMessage);
        } catch (error) {
          await this.sendMessage(chatId, `Error al ejecutar el scraping: ${error.message}`);
        }
      }
    });

    this.bot.onText(/\/urlscrap (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const urlToScrap = match[1];

      await this.sendMessage(chatId, "Iniciando el proceso de scraping...");

      try {
        const result = await WallapopScraper.scrapeUrl(urlToScrap);
        const formattedMessage = this.formatScrapingResults(result);
        await this.sendMessage(chatId, formattedMessage);
      } catch (error) {
        await this.sendMessage(chatId, `Error al ejecutar el scraping: ${error.message}`);
      }
    });

    // Almacenar chatId cuando se recibe un mensaje
    this.bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      if (!this.chatIds.includes(chatId)) {
        this.chatIds.push(chatId); // Agregar el chatId al array
        this.sendWelcomeMessage(chatId); // Enviar mensaje de bienvenida
      }
    });
  }

  // Método para enviar mensajes al chat
  async sendMessage(chatId, text) {
    return this.bot.sendMessage(chatId, text);
  }

  // Método para enviar un mensaje de inicio
  sendStartupMessage() {
    console.log('El bot se ha iniciado y está listo para recibir mensajes.'); // Mensaje en la consola
  }

  // Método para enviar un mensaje de bienvenida
  async sendWelcomeMessage(chatId) {
    await this.sendMessage(chatId, "¡Bienvenido al bot de Telegram! Estoy preparado para recibir mensajes. Usa /ayuda para ver los comandos disponibles.");
  }

  // Método para formatear los resultados del scraping
  formatScrapingResults(results) {
    return results.map(item => `${item.title}\n${item.price} €\n${item.description}\n${item.url}`).join('\n\n');
  }
}

module.exports = TelegramService;
