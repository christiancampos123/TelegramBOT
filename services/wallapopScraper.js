const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// Función principal para extraer datos de Wallapop
async function scrapeUrl(url) {
  const urlsToScrap = [url];
  const cantidadUrls = 5; // Ajusta la cantidad de URLs que deseas extraer por cada categoría
  const allAdUrls = []; // Array para almacenar todas las URLs de anuncios de todas las categorías

  // Configuración de Chrome
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  chromeOptions.addArguments('--headless'); // Ejecutar en modo headless (sin ventana visible)
  chromeOptions.addArguments('--no-sandbox'); // Necesario en algunos entornos de servidor
  chromeOptions.addArguments('--disable-gpu'); // Deshabilitar uso de GPU (opcional)
  chromeOptions.addArguments('--disable-dev-shm-usage'); // Evitar errores de almacenamiento compartido limitado
  chromeOptions.addArguments('--window-size=1920,1080');

  // Crear el driver de Chrome con las opciones configuradas
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();

  try {
    // Iterar sobre cada URL de la lista `urlsToScrap`
    for (const url of urlsToScrap) {
      await driver.get(url);
      await driver.sleep(2000); // Esperar 2 segundos para que la página cargue

      const adUrls = await extractAdUrlsFromSearchPage(driver, cantidadUrls);
      allAdUrls.push(...adUrls); // Añadir URLs de anuncios a la lista total
    }

    // Extraer detalles de cada anuncio encontrado
    const allDetails = await extractDetailsFromUrls(driver, allAdUrls);
    return allDetails; // Retornar todos los detalles extraídos

  } catch (error) {
    console.error('Error al obtener los anuncios:', error);
  } finally {
    await driver.quit();
  }
}

// Función para extraer URLs de anuncios desde la página de búsqueda
async function extractAdUrlsFromSearchPage(driver, cantidadUrls) {
  const adUrls = [];

  try {
    // Recolectar URLs de anuncios hasta alcanzar el número deseado (`cantidadUrls`)
    while (adUrls.length < cantidadUrls) {
      await driver.wait(until.elementsLocated(By.css('.ItemCardList__item')), 10000);
      const adElements = await driver.findElements(By.css('.ItemCardList__item'));

      for (const adElement of adElements) {
        const url = await adElement.getAttribute('href');
        if (url && !adUrls.includes(url)) {
          adUrls.push(url);
          if (adUrls.length >= cantidadUrls) break;
        }
      }

      if (adUrls.length < cantidadUrls) {
        await driver.executeScript('window.scrollTo(0, document.body.scrollHeight);');
        await driver.sleep(3000); // Esperar a que se carguen más elementos al hacer scroll
      }
    }
  } catch (error) {
    console.error('Error al extraer URLs de la página de búsqueda:', error);
  }

  return adUrls;
}

// Función para extraer detalles de los anuncios
async function extractDetailsFromUrls(driver, urls) {
  const allDetails = [];

  for (const url of urls) {
    await driver.get(url);

    let price = null;
    let title = null;
    let state = null;
    let description = null;

    try {
      price = await driver.findElement(By.css('.item-detail-price_ItemDetailPrice--standard__TxPXr')).getText();
    } catch (e) {
      console.log(`No se encontró el precio para ${url}`);
    }

    try {
      title = await driver.findElement(By.css('h1.item-detail_ItemDetail__title__wcPRl.mt-2')).getText();
    } catch (e) {
      console.log(`No se encontró el título para ${url}`);
    }

    try {
      state = await driver.findElement(By.css('.item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT')).getText();
    } catch (e) {
      console.log(`No se encontró el estado para ${url}`);
    }

    try {
      description = await driver.findElement(By.css('section.item-detail_ItemDetail__description__7rXXT.py-4')).getText();
    } catch (e) {
      console.log(`No se encontró la descripción para ${url}`);
    }

    allDetails.push({
      url,
      price: price ? parseFloat(price.split(' ')[0]) : null,
      title,
      state: state && state.includes(' · ') ? state.split(' · ').pop() : state,
      description
    });

    console.log(`Detalles extraídos para ${url}`);
  }
  
  return allDetails; // Asegúrate de retornar todos los detalles extraídos
}

module.exports = { scrapeUrl };
