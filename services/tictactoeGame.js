class TicTacToeGame {
  constructor(bot, chatId) {
    this.bot = bot;
    this.chatId = chatId;
    this.board = Array(3).fill().map(() => Array(3).fill(null)); // Tablero 3x3 vacío
    this.currentPlayer = 'X'; // Jugador inicial
    this.gameOver = false; // Controla si el juego ha terminado
  }

  // Método para mostrar el tablero con botones
  displayBoard() {
    if (this.gameOver) return; // No mostrar el tablero si el juego ha terminado

    const boardMarkup = {
      reply_markup: {
        inline_keyboard: this.board.map((row, rowIndex) => {
          return row.map((cell, colIndex) => {
            return {
              text: cell ? cell : '⬜️', // Muestra X, O o un espacio vacío
              callback_data: `move_${rowIndex}_${colIndex}` // Siempre habilitar botones si el juego no ha terminado
            };
          });
        })
      }
    };

    // Enviar un mensaje que indica que el tablero se está mostrando
    this.bot.sendMessage(this.chatId, 'Aquí está el tablero:', boardMarkup); // Enviar el tablero junto con un mensaje
  }

  // Método para realizar un movimiento
  async makeMove(row, col) {
    if (this.gameOver) return; // No permitir movimientos si el juego ha terminado

    // Verificar si la celda está ocupada
    if (this.board[row][col] !== null) {
      return; // La celda ya está ocupada
    }

    // Realiza el movimiento
    this.board[row][col] = this.currentPlayer;

    // Mostrar el tablero actualizado
    await this.displayBoard(); // Asegúrate de que displayBoard sea un método async si usa await

    // Verificar si hay un ganador
    if (this.checkWin()) {
      this.gameOver = true; // Marcar el juego como terminado
      await this.displayBoard(); // Mostrar el tablero final
      await this.bot.sendMessage(this.chatId, `¡${this.currentPlayer} ha ganado!`);
      await this.promptRestartOrExit(); // Preguntar si quiere reiniciar o salir
      return; // Salir después de anunciar el ganador
    } else if (this.checkDraw()) {
      this.gameOver = true; // Marcar el juego como terminado
      await this.displayBoard(); // Mostrar el tablero final
      await this.bot.sendMessage(this.chatId, '¡Es un empate!');
      await this.promptRestartOrExit(); // Preguntar si quiere reiniciar o salir
      return; // Salir después de anunciar el empate
    }

    // Cambiar el turno
    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
  }


  // Método para preguntar si se quiere reiniciar o salir
  promptRestartOrExit() {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Jugar otra vez', callback_data: 'restart_game' },
            { text: 'Salir del juego', callback_data: 'exit_game' }
          ]
        ]
      }
    };
    this.bot.sendMessage(this.chatId, '¿Qué te gustaría hacer ahora?', options);
  }

  // Verifica si hay un ganador
  checkWin() {
    const winningCombinations = [
      [[0, 0], [0, 1], [0, 2]], // Filas
      [[1, 0], [1, 1], [1, 2]],
      [[2, 0], [2, 1], [2, 2]],
      [[0, 0], [1, 0], [2, 0]], // Columnas
      [[0, 1], [1, 1], [2, 1]],
      [[0, 2], [1, 2], [2, 2]],
      [[0, 0], [1, 1], [2, 2]], // Diagonales
      [[0, 2], [1, 1], [2, 0]]
    ];

    return winningCombinations.some(combination => {
      return combination.every(([row, col]) => this.board[row][col] === this.currentPlayer);
    });
  }

  // Verifica si hay empate
  checkDraw() {
    return this.board.flat().every(cell => cell !== null);
  }

  // Reinicia el tablero para una nueva partida
  resetBoard() {
    this.board = Array(3).fill().map(() => Array(3).fill(null)); // Tablero vacío
    this.currentPlayer = 'X';
    this.gameOver = false; // Reiniciar el estado del juego
    this.displayBoard(); // Mostrar el nuevo tablero
  }
}

module.exports = TicTacToeGame;
