// index.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // Carga las variables del archivo .env

const app = express();
// Middleware para que Express pueda entender el JSON que envía Marketing Cloud
app.use(express.json());

// Configuración del cliente de Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// --- Endpoint principal que Marketing Cloud llamará ---
app.post('/execute', async (req, res) => {
  try {
    console.log("Petición recibida de SFMC:", JSON.stringify(req.body, null, 2));

    // 1. Extraer los datos del cliente que envía Marketing Cloud
    const args = req.body.inArguments[0];
    const { contactKey, firstName, city, interestCategory } = args;

    // 2. Construir el prompt para Gemini
    const prompt = `
      Actúa como un copywriter creativo para una marca de e-commerce.
      Tu tarea es escribir un párrafo corto (aproximadamente 40-50 palabras) y amigable para un email.
      El tono debe ser personal y cercano.
      El formato de salida debe ser un único párrafo dentro de una etiqueta HTML <p>.

      Aquí están los datos del cliente:
      - Nombre: ${firstName}
      - Ciudad: ${city}
      - Categoría de interés principal: ${interestCategory}

      Por favor, redacta el párrafo.
    `;

    // 3. Llamar a la API de Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    console.log("Respuesta de Gemini:", generatedText);

    // 4. Preparar la respuesta para devolver a Marketing Cloud
    const responseToSFMC = {
      outArguments: [{
        "gemini_output_html": generatedText
      }]
    };

    // 5. Enviar la respuesta
    res.status(200).json(responseToSFMC);

  } catch (error) {
    console.error("Error procesando la petición:", error);
    // Es importante devolver un status 500 si algo falla
    res.status(500).send("Internal Server Error");
  }
});

// --- Otros endpoints para el ciclo de vida de la actividad (opcionales pero recomendados) ---
app.post('/save', (req, res) => res.status(200).json({ success: true }));
app.post('/publish', (req, res) => res.status(200).json({ success: true }));
app.post('/validate', (req, res) => res.status(200).json({ success: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));