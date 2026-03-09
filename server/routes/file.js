const {Router} = require('express');
const multer = require('multer');   // подключение библиотеки для работы с файлами
const path = require('path');       // подключение плагина для работы с путями файловой системы
const fs = require('fs');           // подключение плагина для работы с файловой системой
const sharp = require('sharp');     // подключение плагина для работы с изображениями

const router = Router();
// Настройка multer (как и куда сохранять файл)
const upload = multer({
    dest: path.join(__dirname, '../uploads'),
    limits: { fileSize: 10 * 1024 * 1024 }
});


// .../file/upload
router.post('/upload', upload.single('image'), async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Файл не загружен' });
        }

        // Создание объекта json с информацией о файле для последующего сохранения в БД
        const file = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: `/uploads/${req.file.filename}`,
            date: new Date()
        };

        // Чтение текущей базы данных и занесение её в массив объекта
        let db = { files: []};
        try {
            const content = fs.readFileSync('./db/files.json');
            db = JSON.parse(content);
        }
        catch (e) {
            return res.status(400).json({ message: 'Ошибка чтения БД' });
        }

        // Добавление в массив объекта БД нового объекта загруженного файла
        db.files.push(file);

        // Переписывание файла БД с новым объектом
        fs.writeFileSync('./db/files.json', JSON.stringify(db, null, 2));

        // Сообщение об успешной работе
        res.json({
            message: 'Файл успешно загружен',
            file: file
        });
        res.redirect('/')
    }
    catch (e) {
        return res.status(500).json({ message: 'Что-то пошло не так' });
    }
});


// .../file/view
router.get('/view', async(req, res) => {
    try {
        const {img} = req.query;

        if (!img) {
            return res.status(400).json({ message: 'Не указан файл' });
        }

        const pathImg = path.join(__dirname, '../uploads', img);

        if (!fs.existsSync(pathImg)) {
            return res.status(404).json({ message: 'Файл не найден' });
        }

        res.sendFile(pathImg);
    }
    catch (e) {
        return res.status(500).json({ message: 'Что-то пошло не так' });
    }
});

// .../file/save
router.post('/save', async (req, res) => {
    try {
        const {path: imagePath, name, format, width, height} = req.body;

        if (!imagePath || !name || !format || !width || !height)
            return res.status(400).json({ message: 'Не все параметры переданы' });

        const filename = imagePath.split('/').pop();
        const uploadPath = path.join(__dirname, '../uploads', filename);

        if (!fs.existsSync(uploadPath)) {
            return res.status(404).json({ message: 'Исходный файл не найден' });
        }

        const processedPath = path.join(__dirname, '../processed');
        const saveName = `${name}_${Date.now()}.${format.toLowerCase()}`;
        const savePath = path.join(processedPath, saveName);

        await sharp(uploadPath)
        .resize(Number(width), Number(height), { fit: 'contain', background: {r: 255, g: 255, b: 255, alpha: 1} })
        .toFormat(format.toLowerCase())
        .toFile(savePath);

        res.json({
            message: 'Изображение сохранено',
            file: {
                filename: saveName,
                path: `/processed/${saveName}`,
                width,
                height,
                format
            }
        });

    }
    catch (error) {
        console.error('Ошибка сохранения: ', error);
        res.status(500).json({ message: 'Ошибка при сохранении изобажения'});
    }
});


module.exports = router;