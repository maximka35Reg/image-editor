const {Router} = require('express'); // подключение из бибилиотеки только функции Router для создания маршрутов
const multer = require('multer');    // библиотека которая принимает загружаемые файлы через формы
const path = require('path');        // подключение плагина для работы с путями файловой системы
const fs = require('fs');            // подключение плагина для работы с файловой системой
const sharp = require('sharp');      // библиотека для обработки изображений

// создание экземпляра маршрутизатора
const router = Router();


// Настройка multer (как и куда сохранять файл)
const upload = multer({
    dest: path.join(__dirname, '../uploads'), // место куда сохранять загружаемый файл
    limits: { fileSize: 8 * 1024 * 1024 }     // ограничение на размер файла
});
// автоматически добавляет поле file к req


// эндпоинт для POST запросов "/file/upload"
// upload.single - принимает один файл из поля формы image
// async(req, res) - асинхронная функция-обработчик
router.post('/upload', upload.single('image'), async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Файл не загружен' });
            // json() - преобразует js-объект в json
            // метод ожидает в качестве аргумента именно js-объект
        }

        const imageId = Date.now().toString(); // возвращает текущее время в мс
        const uploadPath = `/uploads/${req.file.filename}`;

        // Создание объекта json с информацией о файле для последующего сохранения в БД
        const image = {
            id: imageId,
            originalName: req.file.originalname,
            originalPath: uploadPath,
            currentPath: uploadPath,
            size: req.file.size,
            uploadDate: new Date(),
            versions: [{
                path: uploadPath,
                atEdited: Date.now(),
                action: 'upload'
            }],
        };

        // Чтение текущей базы данных и занесение её в массив объекта
        let db = { images: []};
        const dbPath = path.join(__dirname, '../db/files.json')
        
        try {
            const content = fs.readFileSync(dbPath, 'utf-8');
            db = JSON.parse(content); // превращаем json в js-объект
        }
        catch (e) {
            return res.status(400).json({ message: 'Ошибка чтения БД' });
        }

        // Добавление в БД объекта загруженного изображения
        db.images.push(image);

        // Переписывание БД с новым объектом (превращаем объект в json-строку)
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        // null включает все поля в результат без замен и фильтров
        // 2 пробела для каждого уровня вложенности

        // Сообщение об успешной работе
        res.json({
            message: 'Файл успешно загружен',
            file: {
                id: imageId,                   
                path: uploadPath,
                originalName: req.file.originalname,
                size: req.file.size
            }
        });
    }
    catch (e) {
        return res.status(500).json({ message: 'Что-то пошло не так' });
    }
});


// .../file/filters 
router.post('/filters', upload.single('image'), async(req, res) => {
    try {
        const imagePath = req.file.path;

        const imageId = req.body.imageId;
        const version = req.body.version;

        const brightness = Number(req.body.brightness) || 0;
        const contrast = Number(req.body.contrast) || 0;
        const saturation = Number(req.body.saturation) || 0;
        const blur = Number(req.body.blur) || 0;
        const hue = Number(req.body.hue) || 0;
        const invert = Number(req.body.invert) || 0;
        const sepia = Number(req.body.sepia) || 0;
        const turn = Number(req.body.turn) || 0;
        const flipHorizontal = req.body.flipHorizontal === '1';
        const flipVertical = req.body.flipVertical === '1';
        const width = Number(req.body.width);
        const height = Number(req.body.height);

        let changedImg = sharp(imagePath); // создаём объект sharp для обработки изображения

        // Обрезка (если есть)
        if (req.body.cropX !== undefined && req.body.cropY !== undefined && req.body.cropWidth && req.body.cropHeight)
        {
            const cropX = Math.max(0, Math.round(Number(req.body.cropX)));
            const cropY = Math.max(0, Math.round(Number(req.body.cropY)));
            const cropWidth = Math.max(1, Math.round(Number(req.body.cropWidth)));
            const cropHeight = Math.max(1, Math.round(Number(req.body.cropHeight)));

            // извлекаем прямоугольную область изображения
            changedImg = changedImg.extract({
                left: cropX,
                top: cropY,
                width: cropWidth,
                height: cropHeight
            });
        }

        // Поворот
        if (turn !== 0) {
            changedImg = changedImg.rotate(turn);
        }

        // Отражение
        if (flipHorizontal) changedImg = changedImg.flop();
        if (flipVertical) changedImg = changedImg.flip();

        // Фильтры
        if (invert === 1) changedImg = changedImg.negate({ alpha: false }); // прозрачность не инвертируется

        if (saturation === -100) changedImg = changedImg.grayscale();


        if (brightness !== 0 || saturation !== 0 || hue !== 0) { 
            // преобразуем коэффициенты для изменения яркости и насыщенности
            changedImg = changedImg.modulate({
                brightness: 1 + brightness / 100,
                saturation: 1 + saturation / 100,
                hue: hue
            });
        }

        if (contrast !== 0) {
            const c = 1 + contrast / 100;
            // преобразование яркости каждого пикселя
            // насколько сильно отличаются светлые и темные участки
            // сдвиг нужен для того чтобы эффект не был похож на изменение яркости (тормоз для светлых оттенков и усилитель для тёмных)
            changedImg = changedImg.linear(c, -128 * (c - 1));
        }

        if (blur > 0) changedImg = changedImg.blur(blur);


        if (sepia > 0) {
            const s = sepia / 100; // интенсивность сепии

            // эмпирическая матрица для создания плавного перехода сепии
            // строки формируют новые цвета каналов, а столбцы определяют сколько брать от старых
            const matrix = [
                [0.393 + 0.607 * (1 - s), 0.769 - 0.769 * (1 - s), 0.189 - 0.189 * (1 - s)],
                [0.349 - 0.349 * (1 - s), 0.686 + 0.314 * (1 - s), 0.168 - 0.168 * (1 - s)],
                [0.272 - 0.272 * (1 - s), 0.534 - 0.534 * (1 - s), 0.131 + 0.869 * (1 - s)]
            ];
            changedImg = changedImg.recomb(matrix);
        }

        // Изменение размера с возможностью искажения пропорций
        if (width && height && width > 0 && height > 0) {
            changedImg = changedImg.resize(width, height, { fit: 'fill' });
        }



        // формирование имени для сохранения
        const newVersion = Number(version) + 1;
        const filename = `${imageId}_v${newVersion}.jpg`;
        const uploadPath = path.join(__dirname, '../processed', filename);

        // сохранение обработанного изображения
        await changedImg.toFile(uploadPath);

        // Обновление БД
        const dbPath = path.join(__dirname, '../db/files.json');
        let db = { images: [] };

        if (fs.existsSync(dbPath)) {
            db = JSON.parse(fs.readFileSync(dbPath)); // json в js
        }

        // ищем первый элемент удовлетворяющий условию
        let img = db.images.find(img => img.id === imageId);

        // если ещё не разу не применялись фильтры - создаём новую запись
        if (!img) {
            img = {
                id: imageId,
                defaultPath: `/uploads/${path.basename(imagePath)}`, // basename извлекает только имя файла
                versions: []
            };
            db.images.push(img);
        }

        // проверка от дублирования версий
        const versionExists = img.versions.some(v => v.path === `/processed/${filename}`)

        // добавление новой версии в историю
        // параметры сохраняются для отката к предыдущей версии
        if (!versionExists) {
            img.versions.push({
                path: `/processed/${filename}`,
                params: {
                    brightness: brightness,
                    contrast: contrast,
                    saturation: saturation,
                    blur: blur,
                    hue: hue,
                    invert: invert,
                    sepia: sepia,
                    width: width || null,
                    height: height || null,
                    turn: turn,
                    flipHorizontal: flipHorizontal,
                    flipVertical: flipVertical
                }
            });
        }

        // обновление ссылки на текущую версию изображения в записи изображения
        img.currentPath = `/processed/${filename}`;

        // сохранение обновлённой БД
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        // возвращаем путь к обработанному изображению в виде json 
        res.json({ path: `/processed/${filename}` });
    }
    catch (error) {
        console.log('Ошибка:', error);
        return res.status(500).json({ message: 'Ошибка при изменении параметров изображения' });
    }
});


// .../file/save
router.post('/save', async (req, res) => {
    try {
        const imagePath = req.body.path; 
        const name = req.body.name;
        const format = req.body.format;

        if (!imagePath || !name || !format)
            return res.status(400).json({ message: 'Не все параметры переданы' });

        // адрес разделяется на слеши и берется последний элемент из полученного массива - название файла
        const filename = imagePath.split('/').pop();

        // определяем, где лежит файл изображения
        let uploadPath;
        if (imagePath.includes('/processed/')) {
            uploadPath = path.join(__dirname, '../processed', filename);
        } else {
            uploadPath = path.join(__dirname, '../uploads', filename);
        }
        // path.join позволяет безопасно склеить пути чтобы работало на разынх ОС
        // dirname возвращает абсолютный путь к директории

        // проверка, существует ли файл по указанному пути
        if (!fs.existsSync(uploadPath)) {
            return res.status(404).json({ message: 'Исходный файл не найден' });
        }

        // подготовка пути для сохранения
        const processedPath = path.join(__dirname, '../saved');
        const saveName = `${name}_${Date.now()}.${format.toLowerCase()}`;
        const savePath = path.join(processedPath, saveName);

        await sharp(uploadPath) // загрузка сохраняемого изображения
        .toFormat(format.toLowerCase()) // конвертация в нужный формат
        .toFile(savePath); //сохранение на диск по выбранному пути

        res.setHeader('Content-Type', `image/${format.toLowerCase()}`);
        
        // указываем полученный ответ в виде файла надо скачать
        res.setHeader('Content-Disposition', `attachment; filename="${name}.${format.toLowerCase()}"`);


        const fileStream = fs.createReadStream(savePath); // поток чтения данных файла для сохранения
        fileStream.pipe(res); // объединение потока чтения с потоком ответа - файл читается и частями сразу же отправляется клиенту (сохраняется)
    }
    catch (error) {
        console.error('Ошибка сохранения: ', error);
        res.status(500).json({ message: 'Ошибка при сохранении изобажения'});
    }
});

// экспорт одного модуля для импорта в server.js
module.exports = router;

// exports.module = value - экспорт нескольких вещей