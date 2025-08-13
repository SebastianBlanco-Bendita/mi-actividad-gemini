const cors = require('cors');
const express = require('express');
const helmet = require('helmet'); // <-- 1. Importa Helmet
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config();

const app = express();

// --- INICIO DEL BLOQUE DE SEGURIDAD (CORS y CSP) ---

// Configuración de dominios permitidos para CORS
app.use(cors({
    origin: true, // Permite CUALQUIER origen
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
    exposedHeaders: ['*']
}));



// 2. Configura las cabeceras de Política de Seguridad de Contenido (CSP)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "*"],
            frameAncestors: [
                "'self'", 
                "*", // Permite ser embebido desde cualquier dominio
                "*.exacttarget.com", 
                "*.marketingcloudapps.com",
                "*.salesforce.com"
            ],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "'unsafe-eval'", // Necesario para algunas funcionalidades de SFMC
                "*"
            ],
            styleSrc: ["'self'", "'unsafe-inline'", "*"],
            imgSrc: ["'self'", "data:", "*"],
            connectSrc: ["'self'", "*"],
            fontSrc: ["'self'", "*"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "*"],
            childSrc: ["'self'", "*"]
        }
    },
    frameguard: false, // Permite ser cargado en iframes
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

// --- FIN DEL BLOQUE DE SEGURIDAD ---


// Middleware para que Express pueda entender el JSON
app.use(express.json());

// Sirve archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));


// Configuración del cliente de Gemini API
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        corsEnabled: true,
        origin: req.headers.origin,
        userAgent: req.headers['user-agent']
    });
});

// Endpoint para servir config.json
app.get('/config.json', (req, res) => {
    console.log('Config.json requested by:', req.headers.origin);
    
    const config = {
        "key": "gemini-content-generator-1",
        "name": "Generador de Contenido con IA",
        "description": "Usa la API de Gemini para crear contenido de email personalizado.",
        "type": "REST",
        "workflowApiVersion": "1.1",
        "metaData": {
            "icon": "https://sfmc-gemini-activity.onrender.com/icon.png",
            "iconSmall": "https://sfmc-gemini-activity.onrender.com/icon-small.png"
        },
        "edit": {
            "url": "https://sfmc-gemini-activity.onrender.com/index.html",
            "height": 400,
            "width": 600
        },
        "save": {
            "url": "https://sfmc-gemini-activity.onrender.com/save",
            "verb": "POST",
            "useJwt": false
        },
        "publish": {
            "url": "https://sfmc-gemini-activity.onrender.com/publish",
            "verb": "POST",
            "useJwt": false
        },
        "validate": {
            "url": "https://sfmc-gemini-activity.onrender.com/validate",
            "verb": "POST",
            "useJwt": false
        },
        "execute": {
            "inArguments": [
                {
                    "contactKey": "{{Contact.Key}}",
                    "firstName": "{{Contact.Attribute.Clientes_Intereses.FirstName}}",
                    "city": "{{Contact.Attribute.Clientes_Intereses.City}}",
                    "interestCategory": "{{Contact.Attribute.Clientes_Intereses.InterestCategory}}"
                }
            ],
            "outArguments": [
                {
                    "gemini_output_html": {
                        "dataType": "HTML",
                        "access": "Visible",
                        "direction": "Out"
                    }
                }
            ],
            "url": "https://sfmc-gemini-activity.onrender.com/execute",
            "verb": "POST",
            "useJwt": false,
            "timeout": 25000
        },
        "userInterfaces": {
            "configModal": {
                "height": 400,
                "width": 600,
                "fullscreen": false
            }
        },
        "schema": {
            "arguments": {
                "execute": {
                    "inArguments": [
                        {
                            "firstName": {
                                "dataType": "Text",
                                "isNullable": false,
                                "direction": "In"
                            }
                        },
                        {
                            "city": {
                                "dataType": "Text",
                                "isNullable": true,
                                "direction": "In"
                            }
                        },
                        {
                            "interestCategory": {
                                "dataType": "Text",
                                "isNullable": true,
                                "direction": "In"
                            }
                        }
                    ],
                    "outArguments": [
                        {
                            "gemini_output_html": {
                                "dataType": "HTML",
                                "direction": "Out",
                                "access": "Visible"
                            }
                        }
                    ]
                }
            }
        }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.json(config);
});

// Endpoints de la custom activity
app.post('/execute', async (req, res) => {
    try {
        console.log("=== EXECUTE REQUEST ===");
        console.log("Origin:", req.headers.origin);
        console.log("Body:", JSON.stringify(req.body, null, 2));
        
        if (!req.body.inArguments || !req.body.inArguments[0]) {
            throw new Error('Missing inArguments in request body');
        }
        
        const args = req.body.inArguments[0];
        const { contactKey, firstName, city, interestCategory } = args;

        if (!firstName) {
            throw new Error('firstName is required');
        }

        const prompt = `
          Actúa como un copywriter creativo para una marca de e-commerce.
          Tu tarea es escribir un párrafo corto (aproximadamente 40-50 palabras) y amigable para un email.
          El tono debe ser personal y cercano.
          El formato de salida debe ser un único párrafo dentro de una etiqueta HTML <p>.

          Aquí están los datos del cliente:
          - Nombre: ${firstName}
          - Ciudad: ${city || 'No especificada'}
          - Categoría de interés principal: ${interestCategory || 'General'}

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

        console.log("Respuesta enviada a SFMC:", JSON.stringify(responseToSFMC, null, 2));
        res.status(200).json(responseToSFMC);

    } catch (error) {
        console.error("Error procesando la petición:", error);
        res.status(500).json({ 
            error: "Internal Server Error", 
            message: error.message 
        });
    }
});

app.post('/save', (req, res) => {
    console.log('=== SAVE REQUEST ===');
    console.log('Origin:', req.headers.origin);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    res.status(200).json({ success: true });
});

app.post('/publish', (req, res) => {
    console.log('=== PUBLISH REQUEST ===');
    console.log('Origin:', req.headers.origin);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    res.status(200).json({ success: true });
});

app.post('/validate', (req, res) => {
    console.log('=== VALIDATE REQUEST ===');
    console.log('Origin:', req.headers.origin);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Config: http://localhost:${PORT}/config.json`);
    console.log('CORS: Completamente abierto para desarrollo');
});
