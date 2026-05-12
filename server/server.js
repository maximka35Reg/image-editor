// require - фунукция для подключения внешних библиотек
const express = require('express'); // библиотека для создания веб-сервера
const cors = require('cors');       // библиотеки для настройки механихма CORS
const path = require('path');       // библиотека для работы с путями к файлам/директориям


const app = express(); // экземпляр объекта сервера
const PORT = 3001;     // порт на котором будет работать сервер

// use - функция для подключения функционала к объекту сервера
app.use(express.json());    // функционал для преобразования JSON в JS-объект
app.use(cors());            // разрешение получать любые запросы с любых адресов


// делаем папки доступными на сервере
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/processed', express.static(path.join(__dirname, 'processed')));
app.use('/saved', express.static(path.join(__dirname, 'saved')));

// app.use('/...',  ) - все запросы начинающиеся с /... перенаправляются в папку ... на сервере 

// static - делает папку доступными для обращения по http и раздаёт содержимое этих папок
// path.join - подставляет нужные разделители в зависимости от ОС
// dirname - переменная которая содержит абсолютный путь к текущей директории

// Подключение файла с маршрутами
app.use('/file', require('./routes/file'));

// '/file' - все запросы начинающиеся на /file перенаправляются в routes/file


async function start() {
    try {
        // listen - запускает сервер
        app.listen(PORT, () => console.log(`Сервер запущен на порту: ${PORT}`));
    }
    catch (e) {
        console.log('Ошибка сервера', e.message);
        process.exit(1); // завершение работы сервера
    }
}
start();