const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Initialize express app
const app = express();
const PORT = 3000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// In-memory session storage
const sessions = {};

// Route to create a new session
app.post('/create-session', (req, res) => {
    const sessionId = Date.now().toString(); 
    sessions[sessionId] = { cookies: {}, localStorage: {} };
    res.json({ sessionId });
});

// Middleware to sync cookies
app.use((req, res, next) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId && sessions[sessionId]) {
        req.cookies = { ...req.cookies, ...sessions[sessionId].cookies };
        res.cookie('sessionId', sessionId);
    }
    next();
});

// Proxy for Google Search
app.use('/search', createProxyMiddleware({
    target: 'https://www.google.com',
    changeOrigin: true,
    pathRewrite: {
        '^/search': '', 
    },
    onProxyReq: (proxyReq, req) => {
        const sessionId = req.cookies.sessionId;
        if (sessionId && sessions[sessionId]) {
            Object.entries(sessions[sessionId].cookies).forEach(([key, value]) => {
                proxyReq.setHeader('Cookie', `${key}=${value};`);
            });
        }
    }
}));

// Serve HTML page
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google-like Proxy</title>
    <style>
        body {
            background: linear-gradient(to right, red, yellow, green, blue, pink);
            color: black;
            font-family: Arial, sans-serif;
            text-align: center;
            margin: 0;
            padding: 20px;
        }
        h1 {
            color: white;
        }
        input[type="text"] {
            width: 80%;
            padding: 10px;
            margin-top: 10px;
            border: 2px solid black;
        }
        button {
            padding: 10px 20px;
            margin-top: 10px;
            background-color: white;
            border: 1px solid black;
            cursor: pointer;
        }
        button:hover {
            background-color: gray;
        }
    </style>
</head>
<body>
    <h1>Welcome to My Google-like Proxy</h1>
    <input type="text" id="inputField" placeholder="Search Google or enter a URL" />
    <br />
    <button id="searchButton">Search</button>
    <script>
        document.getElementById('searchButton').onclick = function() {
            const input = document.getElementById('inputField').value;
            if (input.startsWith('http://') || input.startsWith('https://')) {
                window.open(input, '_self');
            } else {
                window.open('http://localhost:3000/search?q=' + encodeURIComponent(input), '_blank');
            }
        };
    </script>
</body>
</html>
    `);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
