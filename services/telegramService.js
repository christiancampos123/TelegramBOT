require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const WallapopScraper = require('./wallapopScraper');
const TicTacToeGame = require('./tictactoeGame'); 
const TriviaService = require('./triviaService');

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

    // Crear instancia del servicio de trivia
    this.triviaService = new TriviaService();

    // Manejador para el comando /trivia
    this.bot.onText(/\/trivia/, async (msg) => {
      const chatId = msg.chat.id;
      await this.startTrivia(chatId);
    });

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
      👾 /tictactoe ••••••• para tres en raya
      👾 /trivia ••••••• Para preguntas de trivia

      
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

  // Función para mezclar un array
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // Intercambiar
    }
    return array;
  }

  async startTrivia(chatId) {
    const question = this.triviaService.getRandomQuestion();

    // Combina las respuestas incorrectas y la correcta en un solo array
    const options = [question.correct_answer, ...question.incorrect_answers];

    // Mezcla las opciones para que estén en un orden aleatorio
    const shuffledOptions = this.shuffle(options);  // Usa this.shuffle para mezclar
    // Crea un array de botones
    const showOptions = shuffledOptions.map((option) => ({
      text: option,
      callback_data: option, // Usamos la opción como callback_data
    }));

    // Divide los botones en filas (puedes tener hasta 2 o 3 opciones por fila)
    const inlineKeyboard = [];
    const rowSize = 2; // Puedes ajustar el tamaño de la fila si lo deseas

    for (let i = 0; i < showOptions.length; i += rowSize) {
      inlineKeyboard.push(showOptions.slice(i, i + rowSize));
    }

    // Envía la pregunta y las opciones al usuario
    await this.bot.sendMessage(chatId, question.question, {
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });

    // Manejar la respuesta del usuario al presionar un botón
    this.bot.once('callback_query', async (callbackQuery) => {
      const userAnswer = callbackQuery.data; // La opción seleccionada por el usuario
      const isCorrect = this.triviaService.checkAnswer(userAnswer, question.correct_answer);

      // Respuesta del bot según la respuesta del usuario
      if (isCorrect) {
        await this.bot.sendMessage(chatId, "¡Correcto! 🎉");
      } else {
        await this.bot.sendMessage(chatId, `Incorrecto. La respuesta correcta era ${question.correct_answer}.`);
      }

      // Enviar botones para preguntar si quieren jugar otra vez
      const buttonsYesNo = [
        [
          { text: "Sí", callback_data: "yes" },
          { text: "No", callback_data: "no" }
        ],
      ];

      // Enviar mensaje con los botones
      await this.bot.sendMessage(chatId, "¿Quieres otra pregunta?", {
        reply_markup: {
          inline_keyboard: buttonsYesNo,
        },
      });

      // Manejar la respuesta del usuario a la pregunta de si quieren otra pregunta
      this.bot.once('callback_query', async (callbackQuery) => {
        const action = callbackQuery.data;

        if (action === 'yes') {
          await this.startTrivia(chatId);
        } else {
          await this.bot.sendMessage(chatId, "Gracias por jugar!"); // Mensaje de despedida
        }

        // Acknowledge the callback query to remove the loading state
        this.bot.answerCallbackQuery(callbackQuery.id);
      });

      // Acknowledge the callback query to remove the loading state
      this.bot.answerCallbackQuery(callbackQuery.id);
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
