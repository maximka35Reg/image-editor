//require - глобальная функция для подключения пакетов
const express = require('express'); // подключение..
const config = require('config');   // подключение
const cors = require('cors');       // подключение библиотеки для работы с механизмом CORS
const path = require('path');
const fs = require('fs');


const app = express(); // Будующий сервер из конструктора express
const PORT = config.get('port') || 3001;


app.use(express.json()); // Подключение функционала чтобы сервер понимал JSON
app.use(cors()); // 


// Подключение функционала чтобы файлы были доступны по URL
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/processed', express.static(path.join(__dirname, 'processed')));
app.use('/saved', express.static(path.join(__dirname, 'saved')));

// Подключение маршрутов
app.use('/file', require('./routes/file'));

async function start() {
    try {
        app.listen(PORT, () => console.log(`Сервер запущен на порту: ${PORT}`)); // Сервер ловит запросы по указанному порту
    }
    catch (e) {
        console.log('Ошибка сервера', e.message);
        process.exit(1);
    }
}

start();