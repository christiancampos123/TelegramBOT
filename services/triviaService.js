// triviaService.js
const fs = require('fs');

class TriviaService {
  constructor() {
    this.triviaQuestions = this.loadTriviaQuestions(); // Cargar las preguntas al iniciar el servicio
  }

  // Método para cargar preguntas de trivia desde trivia.json
  loadTriviaQuestions() {
    try {
      const data = fs.readFileSync('trivia.json', 'utf8'); // Leer el archivo
      return JSON.parse(data); // Parsear y devolver las preguntas
    } catch (error) {
      console.error("Error al cargar preguntas de trivia:", error);
      return []; // Devolver un array vacío en caso de error
    }
  }

  // Método para obtener una pregunta aleatoria
  getRandomQuestion() {
    const questionIndex = Math.floor(Math.random() * this.triviaQuestions.length);
    return this.triviaQuestions[questionIndex];
  }

  // Método para verificar la respuesta
  checkAnswer(userAnswer, correctAnswer) {
    return userAnswer.toUpperCase() === correctAnswer.toUpperCase();
  }
}

module.exports = TriviaService;
