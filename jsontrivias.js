const fetch = require('node-fetch');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTriviaData() {
  const baseUrl = 'https://opentdb.com/api.php';
  const categories = Array.from({ length: 30 }, (_, i) => i + 1); // Categories 1 to 30
  const difficulties = ['easy', 'medium', 'hard'];
  let allQuestions = [];

  for (const category of categories) {
    for (const difficulty of difficulties) {
      const url = `${baseUrl}?amount=50&category=${category}&difficulty=${difficulty}`;
      try {
        // Añade un retraso de 1 segundo (1000 ms) entre cada solicitud
        await sleep(6000);

        const response = await fetch(url);
        const data = await response.json();

        console.log(url);

        if (data.response_code == 0) {
          const filteredQuestions = data.results.map((question) => ({
            question: question.question,
            correct_answer: question.correct_answer,
            incorrect_answers: question.incorrect_answers,
          }));

          allQuestions = allQuestions.concat(filteredQuestions);
          console.log(`Fetched data for category ${category} - ${difficulty}`);
        } else {
          console.log(`No data for category ${category} - ${difficulty}`);
        }
      } catch (error) {
        console.error(`Failed to fetch data for category ${category} - ${difficulty}:`, error.message);
      }
    }
  }

  // Guarda los datos obtenidos en un archivo JSON
  fs.writeFileSync('triviaData.json', JSON.stringify(allQuestions, null, 2));
  console.log('Data has been written to triviaData.json');
}

fetchTriviaData();
