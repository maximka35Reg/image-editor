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

        const imageId = Date.now().toString();
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
                action: { type: 'upload' }
            }],
        };

        // Чтение текущей базы данных и занесение её в массив объекта
        let db = { images: []};
        const dbPath = path.join(__dirname, '../db/files.json')
        
        try {
            const content = fs.readFileSync(dbPath, 'utf-8');
            db = JSON.parse(content);
        }
        catch (e) {
            return res.status(400).json({ message: 'Ошибка чтения БД' });
        }

        // Добавление в массив объекта БД нового объекта загруженного файла
        db.images.push(image);

        // Переписывание файла БД с новым объектом
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

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


// .../file/filters 
router.post('/filters', upload.single('image'), async(req, res) => {
    try {
        const imageId = req.body.imageId;
        const version = req.body.version;

        const brightness = req.body.brightness;
        const contrast = req.body.contrast;
        const blur = req.body.blur;
        const temperature = req.body.temperature;
        const saturation = req.body.saturation;

        const imagePath = req.file.path;
    
        const newVersion = Number(version) + 1;
        const filename = `${imageId}_v${newVersion}.jpg`;
        const uploadPath = path.join(__dirname, '../processed', filename);

        let changedImg = sharp(imagePath);

        if (brightness !== undefined || saturation !== undefined) {
            const brightnessVal = 1 + (Number(brightness) / 100);
            const saturationVal = 1 + (Number(saturation) / 100);
            changedImg = changedImg.modulate({ brightness: brightnessVal, saturation: saturationVal })
        }


        if (Number(contrast) !== 0 && contrast !== undefined) {
            const contrastVal = 1 + (Number(contrast) / 100);
            changedImg = changedImg.linear(contrastVal, 0);
        }

        if (blur !== undefined && Number(blur) > 0) {
            changedImg = changedImg.blur(Number(blur));
        }

        if (temperature !== undefined && Number(temperature) !== 0) {
            const temp = Number(temperature);
            let tempVal;
            if (temp < 0) {
                const cold = Math.abs(temp) / 100;
                tempVal = { r: 255, g: 255, b: Math.round(255 - (cold * 100)) };
            }
            else {
                const heat = temp / 100;
                tempVal = { r: 255, g: Math.round(255 - (heat * 50)), b: Math.round(255 - (heat * 100)) };
            }
            changedImg = changedImg.tint(tempVal);
        }

        await changedImg.toFile(uploadPath);

        // Обновление БД
        const dbPath = path.join(__dirname, '../db/files.json');
        let db = { images: [] };

        if (fs.existsSync(dbPath)) {
            db = JSON.parse(fs.readFileSync(dbPath));
        }

        let img = db.images.find(img => img.id === imageId);

        if (!img) {
            img = {
                id: imageId,
                defaultPath: `/uploads/${path.basename(imagePath)}`,
                versions: [],
                history: []
            };
            db.images.push(img);
        }

        const versionExists = img.versions.some(v => v.path === `/processed/${filename}`)

        if (!versionExists) 
            img.versions.push({
                path: `/processed/${filename}`,
                atEdited: req.body.lastEdited,
                params: {
                    brightness: brightness,
                    contrast: contrast,
                    saturation: saturation,
                    blur: blur,
                    temperature: temperature
                }
            });


        img.currentPath = `/processed/${filename}`;

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        res.json({
            message: 'Параметры применены',
            path: `/processed/${filename}`
        });
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
        const width = req.body.width;
        const height = req.body.height;
        const params = req.body.params;

        if (!imagePath || !name || !format || !width || !height || !params)
            //ответ фронту
            return res.status(400).json({ message: 'Не все параметры переданы' });

        // адрес разделяется на слеши и берется последний элемент из полученного массива - название файла
        const filename = imagePath.split('/').pop();

        //path.join позволяет безопасно склеить пути чтобы работало на разынх ОС (разные слеши используют)
        let uploadPath;
        if (imagePath.includes('/processed/')) {
            uploadPath = path.join(__dirname, '../processed', filename);
        } else {
            uploadPath = path.join(__dirname, '../uploads', filename);
        }

        if (!fs.existsSync(uploadPath)) {
            return res.status(404).json({ message: 'Исходный файл не найден' });
        }

        //dirname - папка в которой лежит текущий файл
        //../ поднимает на один уровень вверх и переходит к папке processed
        const processedPath = path.join(__dirname, '../saved');
        const saveName = `${name}_${Date.now()}.${format.toLowerCase()}`;
        const savePath = path.join(processedPath, saveName);

        await sharp(uploadPath)
        .resize(Number(width), Number(height), {fit: 'contain'}) //изменение размера
        .toFormat(format.toLowerCase()) // конвертация в нужный формат
        .toFile(savePath); //сохранение на диск по выбранному пути

        res.json({
            message: 'Изображение сохранено',
            file: {
                path: `/saved/${saveName}`,
            }
        });

    }
    catch (error) {
        console.error('Ошибка сохранения: ', error);
        res.status(500).json({ message: 'Ошибка при сохранении изобажения'});
    }
});
/*
// .../file/download
router.get('/download', async (req, res) => {
    try {
    const {filename} = req.query;

    if (!filename) {
        return res.status(400).json({message: 'Не указан файл'});
    }

    const filepath = path.join(__dirname, '../saved', filename);

    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: 'Файл не найден'});
    }

    res.download(filepath, filename);
    }
    catch (error) {
        console.error('Ошибка скачивания: ', error);
        return res.status(500).json({ message: 'Ошибка при скачивании файла' });
    }
});
*/


module.exports = router;