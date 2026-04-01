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

        let changedImg = sharp(imagePath);

        // Сначала обрезка, если есть
        if (req.body.cropX !== undefined && req.body.cropY !== undefined && req.body.cropWidth && req.body.cropHeight) {
            const cropX = Math.max(0, Math.round(Number(req.body.cropX)));
            const cropY = Math.max(0, Math.round(Number(req.body.cropY)));
            const cropWidth = Math.max(1, Math.round(Number(req.body.cropWidth)));
            const cropHeight = Math.max(1, Math.round(Number(req.body.cropHeight)));
            
            changedImg = changedImg.extract({ left: cropX, top: cropY, width: cropWidth, height: cropHeight });
        }

        if (invert === 1) {
    changedImg = changedImg.negate({ alpha: false });
}

// Градации серого (если saturation = -100)
if (saturation === -100) {
    changedImg = changedImg.grayscale();
}

// Яркость, насыщенность, оттенок
if (brightness !== 0 || saturation !== 0 || hue !== 0) {
    changedImg = changedImg.modulate({
        brightness: 1 + (brightness / 100),
        saturation: 1 + (saturation / 100),
        hue: hue
    });
}

// Контраст
if (contrast !== 0) {
    const contrastVal = 1 + (contrast / 100);
    changedImg = changedImg.linear(contrastVal, -128 * (contrastVal - 1));
}

// Размытие
if (blur > 0) {
    changedImg = changedImg.blur(blur);
}

// Сепия
if (sepia > 0) {
    const s = sepia / 100;
    const matrix = [
        [0.393 + 0.607 * (1 - s), 0.769 - 0.769 * (1 - s), 0.189 - 0.189 * (1 - s)],
        [0.349 - 0.349 * (1 - s), 0.686 + 0.314 * (1 - s), 0.168 - 0.168 * (1 - s)],
        [0.272 - 0.272 * (1 - s), 0.534 - 0.534 * (1 - s), 0.131 + 0.869 * (1 - s)]
    ];
    changedImg = changedImg.recomb(matrix);
}

        // Потом изменение размера
        if (width && height && width > 0 && height > 0) {
            changedImg = changedImg.resize(width, height, { fit: 'fill' });
        }

        // Наконец поворот и отражения
         if (turn !== 0) {
            changedImg = changedImg.rotate(turn);
        }

        if (flipHorizontal) changedImg = changedImg.flop();
        if (flipVertical) changedImg = changedImg.flip();

    
        const newVersion = Number(version) + 1;
        const filename = `${imageId}_v${newVersion}.jpg`;
        const uploadPath = path.join(__dirname, '../processed', filename);

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
                versions: []
            };
            db.images.push(img);
        }

        const versionExists = img.versions.some(v => v.path === `/processed/${filename}`)

        if (!versionExists) 
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
                    turn: turn,                    // ← добавить
                    flipHorizontal: flipHorizontal,          // ← добавить
                    flipVertical: flipVertical
                }
            });


        img.currentPath = `/processed/${filename}`;

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        res.json({ path: `/processed/${filename}` });
    }
    catch (error) {
        console.log('Ошибка:', error);
        return res.status(500).json({ message: 'Ошибка при изменении параметров изображения' });
    }
});

router.post('/crop', upload.single('image'), async (req, res) => {
    try {
       const { cropX, cropY, cropWidth, cropHeight } = req.body;
        
        console.log('Сервер получил:', { cropX, cropY, cropWidth, cropHeight });
        
        if (cropX === undefined || cropY === undefined || cropWidth === undefined || cropHeight === undefined) {
            return res.status(400).json({ message: 'Не все параметры' });
        }

        const imagePath = req.file.path;
        
        // Проверяем, что координаты не отрицательные
        const left = Math.max(0, Math.round(Number(cropX)));
        const top = Math.max(0, Math.round(Number(cropY)));
        const width = Math.max(1, Math.round(Number(cropWidth)));
        const height = Math.max(1, Math.round(Number(cropHeight)));
        
        console.log('После обработки:', { left, top, width, height });
        
        const filename = `cropped_${Date.now()}.jpg`;
        const outputPath = path.join(__dirname, '../processed', filename);
        
        await sharp(imagePath)
            .extract({ left, top, width, height })
            .toFile(outputPath);
        
        res.json({ path: `/processed/${filename}` });
    } catch (error) {
        console.error('Ошибка обрезки:', error);
        res.status(500).json({ message: 'Ошибка обрезки: ' + error.message });
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
        .resize(Number(width), Number(height), {  fit: 'fill' }) //изменение размера
        .toFormat(format.toLowerCase()) // конвертация в нужный формат
        .toFile(savePath); //сохранение на диск по выбранному пути

        res.setHeader('Content-Type', `image/${format.toLowerCase()}`);
        res.setHeader('Content-Disposition', `attachment; filename="${name}.${format.toLowerCase()}"`);

        const fileStream = fs.createReadStream(savePath);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error('Ошибка сохранения: ', error);
        res.status(500).json({ message: 'Ошибка при сохранении изобажения'});
    }
});

module.exports = router;