const cors = require('cors');
const express = 'express';
const helmet = require('helmet'); // <-- 1. Importa Helmet
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config();

const app = express();

// --- INICIO DEL BLOQUE DE SEGURIDAD (CORS y CSP) ---

// Configuración de dominios permitidos para CORS
const allowedOrigins = [
    'https://mc.exacttarget.com',
    'https://jb-prod.exacttarget.com',
    'https://journeybuilder.exacttarget.com'
    // Puedes añadir tu dominio de Render para pruebas si es necesario
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));


// 2. Configura las cabeceras de Política de Seguridad de Contenido (CSP)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // Permite que tu app sea cargada en un iframe por Marketing Cloud
            frameAncestors: ["'self'", "*.exacttarget.com", "*.marketingcloudapps.com"],
            // Permite cargar scripts de tu propio dominio y de CDNs si los usas
            scriptSrc: ["'self'", "'unsafe-inline'", "https://ajax.googleapis.com"],
            // Permite estilos en línea y de tu propio dominio
            styleSrc: ["'self'", "'unsafe-inline'"],
            // Permite cargar imágenes de tu dominio y también data URIs
            imgSrc: ["'self'", "data:", "https://*.onrender.com"],
            // Permite conexiones a la API de Google y a tu propio dominio
            connectSrc: ["'self'", "https://generativelanguage.googleapis.com"]
        }
    },
    // Desactiva una cabecera que puede causar problemas con iframes
    frameguard: false
}));

// --- FIN DEL BLOQUE DE SEGURIDAD ---


// Middleware para que Express pueda entender el JSON
app.use(express.json());

// Sirve archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));


// Configuración del cliente de Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });


// --- Endpoint principal que Marketing Cloud llamará ---
app.post('/execute', async (req, res) => {
    try {
        console.log("Petición recibida de SFMC:", JSON.stringify(req.body, null, 2));
        const args = req.body.inArguments[0];
        const { contactKey, firstName, city, interestCategory } = args;

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        console.log("Respuesta de Gemini:", generatedText);

        const responseToSFMC = {
            outArguments: [{
                "gemini_output_html": generatedText
            }]
        };

        res.status(200).json(responseToSFMC);

    } catch (error) {
        console.error("Error procesando la petición:", error);
        res.status(500).send("Internal Server Error");
    }
});

// --- Otros endpoints para el ciclo de vida de la actividad ---
app.post('/save', (req, res) => {
    console.log('Request to /save');
    res.status(200).json({ success: true });
});

app.post('/publish', (req, res) => {
    console.log('Request to /publish');
    res.status(200).json({ success: true });
});

app.post('/validate', (req, res) => {
    console.log('Request to /validate');
    res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
