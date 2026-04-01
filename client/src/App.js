import React, { useState, useRef, useEffect } from "react";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './App.css'


function App() {

  const [imageId, setImageId] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [originalImg, setOriginalImg] = useState(null);

  const [versions, setVersions] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(-1);

  const [imageSize, setImageSize] = useState({width: 0, height: 0});
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });


  const [hasChange, setHasChange] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const [active, setActive] = useState('crop');
  const [activeTool, setActiveTool] = useState('cropTool');
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ unit: '%', width: 50, aspect: 1 });

  const [width, setWidth] = useState(imageSize.width);
  const [height, setHeight] = useState(imageSize.height);
  const [sizeLock, setSizeLock] = useState(true);
  const [sizeChanges, setSizeChanges] = useState(false);


  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [blur, setBlur] = useState(0);
  const [hue, setHue] = useState(0);
  const [invert, setInvert] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [turn, setTurn] = useState(0);

  const [currentParam, setCurrentParam] = useState('brightness');
  const [paramValue, setParamValue] = useState(0);
  const [paramLabel, setParamLabel] = useState('Яркость');
  const [paramMin, setParamMin] = useState(-100);
  const [paramMax, setParamMax] = useState(100);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalFormat, setModalFormat] = useState('JPEG');
  const [modalWidth, setModalWidth] = useState(0);
  const [modalHeight, setModalHeight] = useState(0);
  const [modalLock, setModalLock] = useState(true);

  const imgRef = useRef(null);
  useEffect(() => {
    console.log('currentVersion ИЗМЕНИЛСЯ:', currentVersion);
}, [currentVersion]);

useEffect(() => {
    console.log('ПАРАМЕТРЫ ИЗМЕНИЛИСЬ:', {
        brightness, contrast, saturation, blur, hue, invert, sepia
    });
}, [brightness, contrast, saturation, blur, hue, invert, sepia]);
    async function fileUpload (e) {
    const file = e.target.files[0];
    if(!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Можно загружать только изображения.');
            e.target.value = '';
            return;
    }

    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch ('http://localhost:3001/file/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    const firstVersion = {
      path: `http://localhost:3001${data.file.path}`,
      timestamp: Date.now(),
      name: file.name,
      isOriginal: true,
      params: {
        width: null,
        height: null,
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0,
        hue: 0,
        sepia: 0,
        turn: 0,
        flipHorizontal: false,
        flipVertical: false
      }
    }

    setImageId(data.file.id || Date.now().toString());
    setOriginalImg(`http://localhost:3001${data.file.path}`);
    setCurrentImage(`http://localhost:3001${data.file.path}`);
    setVersions([firstVersion]);
    setCurrentVersion(0);

    //Получение размера изображения
    const img = new Image();
    img.onload = () => {
      setImageSize({width: img.width, height: img.height});
      setOriginalSize({ width: img.width, height: img.height });
      setWidth(img.width);
      setHeight(img.height);
      setModalWidth(img.width);
      setModalHeight(img.height);
      setPreviewMode(false);

      resetParams(img.width, img.height);
    };
    img.src = `http://localhost:3001${data.file.path}`;
  }
  

    async function applyFilter(targetWidth = width, targetHeight = height) {
    if (!currentImage || !imageId) return;

    try {
      const response = await fetch(currentImage);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');
      formData.append('imageId', imageId);
      formData.append('version', currentVersion);

      formData.append('brightness', brightness);
      formData.append('contrast', contrast);
      formData.append('saturation', saturation);
      formData.append('blur', blur);
      formData.append('hue', hue);
      formData.append('invert', invert);
      formData.append('sepia', sepia);
      formData.append('flipHorizontal', flipHorizontal ? 1 : 0);
      formData.append('flipVertical', flipVertical ? 1 : 0);
      formData.append('turn', turn);

      const safeWidth = targetWidth || width || imageSize.width;
      const safeHeight = targetHeight || height || imageSize.height; 
      formData.append('width', safeWidth);
      formData.append('height', safeHeight);

      if (isCropping && crop.width && crop.height && imgRef.current) {
        const img = imgRef.current;
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        const rect = img.getBoundingClientRect();
        const scaleX = naturalWidth / rect.width;
        const scaleY = naturalHeight / rect.height;
        
        formData.append('cropX', Math.round(crop.x * scaleX));
        formData.append('cropY', Math.round(crop.y * scaleY));
        formData.append('cropWidth', Math.round(crop.width * scaleX));
        formData.append('cropHeight', Math.round(crop.height * scaleY));
      }

      const res = await fetch(`http://localhost:3001/file/filters`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

if (data.path) {

  const basePath = `http://localhost:3001${data.path}`;
  const newPath = `${basePath}?t=${Date.now()}`; // 🔥 добавили анти-кэш

  const newVersion = {
    path: newPath,
    params: {
      brightness,
      contrast,
      saturation,
      blur,
      hue,
      invert,
      sepia,
      width: safeWidth,
      height: safeHeight,
      turn,
      flipHorizontal,
      flipVertical
    },
  };

  setCurrentImage(newPath); // 🔥 используем новый путь

  const newVersions = [...versions.slice(0, currentVersion + 1), newVersion];
  setVersions(newVersions);
  setCurrentVersion(newVersions.length - 1);

  setPreviewMode(false);
  setHasChange(false);
  setIsCropping(false);

  const img = new Image();
  img.onload = () => {
    setImageSize({ width: img.width, height: img.height });

    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setBlur(0);
    setHue(0);
    setInvert(0);
    setSepia(0);
    setParamValue(0);
    setCurrentParam('brightness');
  };

  img.src = newPath; // 🔥 тоже новый путь
}
    }
    catch (error) {
      console.error('Ошибка: ', error);
    }
  }



  const applyCrop = async () => {
    if (!crop.width || !crop.height || !imgRef.current) return;
    await applyFilter(width, height);
  };

  function selectParameter(param) {
  setCurrentParam(param);

    switch (param) {
      case 'brightness':
        setParamLabel('Яркость');
        setParamMin(-100);
        setParamMax(100);
        setParamValue(brightness);
        break;
       case 'contrast':
        setParamLabel('Контраст');
        setParamMin(-100);
        setParamMax(100);
        setParamValue(contrast);
        break;
      case 'saturation':
        setParamLabel('Насыщенность');
        setParamMin(-100);
        setParamMax(100);
        setParamValue(saturation);
        break;
      case 'blur':
        setParamLabel('Размытие');
        setParamMin(0);
        setParamMax(20);
        setParamValue(blur);
        break;
      case 'hue':
        setParamLabel('Оттенок');
        setParamMin(0);
        setParamMax(360);
        setParamValue(hue);
        break;
    }
  }


    function paramChange (e) {
    const newValue = Number(e.target.value);
    setParamValue(newValue);

    switch(currentParam) {
      case 'brightness':
        setBrightness(newValue);
        break;
      case 'contrast':
        setContrast(newValue);
        break;
      case 'saturation':
        setSaturation(newValue);
        break;
      case 'blur':
        setBlur(newValue);
        break;
      case 'hue':
        setHue(newValue);
        break;
    }
    
    setPreviewMode(true);
    setHasChange(true);
  }

  function resetParams(newWidth, newHeight) {
    console.trace('resetParams ВЫЗВАН');
    setWidth(newWidth);
    setHeight(newHeight);
    setSizeChanges(false);
    
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setBlur(0);
    setHue(0);
    setSepia(0);
    setTurn(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setInvert(0);
    
    setPreviewMode(false);
    setHasChange(false);
    setIsCropping(false);
  }


   function applyFilterSet(set) {
    console.log('=== ПРЕСЕТ ===', set);
    
    // ВРЕМЕННЫЕ ПЕРЕМЕННЫЕ
    let newBrightness = 0;
    let newContrast = 0;
    let newSaturation = 0;
    let newBlur = 0;
    let newHue = 0;
    let newInvert = 0;
    let newSepia = 0;
    
    switch (set) {
        case 'none':
            break;
        case 'grayscale': 
            newSaturation = -100;
            break;
        case 'invert': 
            newInvert = 1;
            break;
        case 'warm': 
            newSaturation = 80;
            newContrast = 10;
            newBrightness = 5;
            newSepia = 40;
            break;
        case 'cold': 
            newBrightness = 10;
            newContrast = 5;
            newSaturation = -50;
            newHue = 195;
            newSepia = 15;
            break;
        case 'soft': 
            newBrightness = 15;
            newBlur = 1.5;
            newContrast = -5;
            newSaturation = 100;
            break;
        default:
            break;
    }
    
    setBrightness(newBrightness);
    setContrast(newContrast);
    setSaturation(newSaturation);
    setBlur(newBlur);
    setHue(newHue);
    setInvert(newInvert);
    setSepia(newSepia);
    
    setCurrentParam(set);
    setPreviewMode(true);
    setHasChange(true);
}

  function defaultSize() {
    setWidth(originalSize.width);
    setHeight(originalSize.height);
    setSizeChanges(false);
    setPreviewMode(true);
    applyFilter(originalSize.width, originalSize.height);
  }

   function toolChangeWidth (e) {
    const newW = Number(e.target.value);
    setWidth(newW);

    if (sizeLock && imageSize.width > 0) {
      const newH = Math.round((newW / imageSize.width) * imageSize.height);
      setHeight(newH);
    }

    setSizeChanges(true);
    setPreviewMode(true);
  }

  function toolChangeHeight (e) {
    const newH = Number(e.target.value);
    setHeight(newH);

    if (sizeLock && imageSize.height > 0) {
      const newW = Math.round((newH / imageSize.height) * imageSize.width);
      setWidth(newW);
    }

    setSizeChanges(true);
    setPreviewMode(true);
  }


  function preview() {
    let filters = `
      brightness(${1 + brightness/100})
      contrast(${1 + contrast/100})
      saturate(${1 + saturation/100})
      ${blur> 0 ? `blur(${blur}px)` : ''}
    `;
    
    if (hue !== 0) {
      filters += ` hue-rotate(${hue}deg)`;
    }
    
    if (sepia > 0) {
      filters += ` sepia(${sepia}%)`;
    }
    
    if (invert === 1) {
      filters += ` invert(100%)`;
    }
            
    let transforms = [];

    if (width > 0 && height > 0 && (width !== imageSize.width || height !== imageSize.height)) {
      transforms.push(` scale(${width / imageSize.width}, ${height / imageSize.height})`);
    }

    if (turn !== 0) {
      transforms.push(` rotate(${turn}deg)`);
    }

    if (flipHorizontal && flipVertical) {
        transforms.push(' rotateY(180deg) rotateX(180deg)');
    } else if (flipHorizontal) {
        transforms.push(' rotateY(180deg)');
    } else if (flipVertical) {
        transforms.push(' rotateX(180deg)');
    }
 
    const transform = transforms.length > 0 ? transforms.join(' ') : 'none';

    return {
      filter: filters,
      transform: transform  
    }
  };


  function loadVersion(versionIndex) {
    console.trace('loadVersion ВЫЗВАН, версия:', versionIndex);
    if (versionIndex < 0 || versionIndex >= versions.length) return;
    
    const version = versions[versionIndex];
    setCurrentVersion(versionIndex);
    setCurrentImage(version.path);
    
    if (version.params) {
        setBrightness(version.params.brightness || 0);
        setContrast(version.params.contrast || 0);
        setSaturation(version.params.saturation || 0);
        setBlur(version.params.blur || 0);
        setHue(version.params.hue || 0);
        setSepia(version.params.sepia || 0);
        setTurn(version.params.turn || 0);
        setInvert(version.params.invert || 0);
        setFlipHorizontal(version.params.flipHorizontal || false);
        setFlipVertical(version.params.flipVertical || false);
        
        const newWidth = version.params.width || imageSize.width;
        const newHeight = version.params.height || imageSize.height;
        setWidth(newWidth);
        setHeight(newHeight);
        setImageSize({ width: newWidth, height: newHeight });
    }
    
    setPreviewMode(false);
    setSizeChanges(false);
    setHasChange(false);
    setIsCropping(false);
}

function goPrev() {
    if (currentVersion > 0) {
        loadVersion(currentVersion - 1);
    }
}

function goNext() {
    if (currentVersion < versions.length - 1) {
        loadVersion(currentVersion + 1);
    }
}


  function resetChanges() {
    console.trace('resetChanges ВЫЗВАН');
    if (!originalImg) return;

    const img = new Image();
    img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        setCurrentImage(originalImg);
        setVersions([versions[0]]); // Оставляем только первую версию
        setCurrentVersion(0);
        resetParams(img.width, img.height);
    };
    img.src = originalImg;
  }




 

  function tools () {
    switch(active) {
      case 'crop':
        return (
          <div className="Tools">
              <div className={activeTool === 'cropTool' ? 'active' : ''} onClick={() => { setIsCropping(true); setActiveTool('cropTool'); setPreviewMode(true); setHasChange(true); }}>                      
                <svg width="35px" height="35px" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" strokeWidth="3" stroke="currentColor" fill="none"><path d="M6.81,17.68H44.63a1,1,0,0,1,1,1v39"/><path d="M57.19,46.32H18.37a1,1,0,0,1-1-1v-39"/></svg>
                <span>Обрезка</span>
              </div>


              {isCropping && (
  <>
    <button onClick={applyCrop} className="apply-btn">Применить обрезку</button>
    <button onClick={() => setIsCropping(false)} className="cancel-btn">Отмена</button>
  </>
)}

              <div className={activeTool === 'rotateTool' ? 'active' : ''} onClick={() => { 
    setTurn((turn + 90) % 360);
    setPreviewMode(true);
    setHasChange(true);
}}>                              
                <svg width="35px" height="35px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 7V10M16 10H13M16 10C14.9173 9.23345 13.9223 8.23101 12.5576 8.03902C11.6988 7.91819 10.824 8.07974 10.0649 8.4993C9.3059 8.91887 8.7038 9.57374 8.34934 10.3652C7.99489 11.1567 7.90728 12.042 8.09972 12.8876C8.29217 13.7332 8.75424 14.4933 9.41631 15.0535M15.7733 13.3292C15.4851 14.1471 14.9388 14.8493 14.2169 15.3298C13.4949 15.8103 12.6363 16.0432 11.7704 15.9934M4 6V4H20V20H4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Поворот 90°</span>
              </div>

              <div className={activeTool === 'flipHorizontal' ? 'active' : ''} onClick={() => { setFlipHorizontal(!flipHorizontal); setPreviewMode(true); setHasChange(true); }}>                     
                <svg width="35px" height="35px" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M15.079 3.46209C15.3762 3.17355 15.851 3.18054 16.1396 3.47771L19.538 6.9777C19.8205 7.26871 19.8205 7.73162 19.538 8.02263L16.1396 11.5226C15.851 11.8198 15.3762 11.8268 15.079 11.5382C14.7819 11.2497 14.7749 10.7749 15.0634 10.4777L17.2263 8.25015L4.99989 8.25015C4.58567 8.25015 4.24989 7.91437 4.24989 7.50015C4.24989 7.08594 4.58567 6.75015 4.99989 6.75015L17.2263 6.75015L15.0634 4.52264C14.7749 4.22546 14.7819 3.75064 15.079 3.46209ZM8.92071 12.4618C9.21788 12.7504 9.22488 13.2252 8.93633 13.5224L6.77327 15.7501L18.9999 15.7501C19.4141 15.7501 19.7499 16.0859 19.7499 16.5001C19.7499 16.9143 19.4141 17.2501 18.9999 17.2501L6.77366 17.2501L8.93633 19.4774C9.22488 19.7746 9.21788 20.2494 8.92071 20.538C8.62353 20.8265 8.14871 20.8195 7.86016 20.5224L4.46177 17.0224C4.17922 16.7314 4.17922 16.2685 4.46177 15.9774L7.86016 12.4775C8.14871 12.1803 8.62353 12.1733 8.92071 12.4618Z"/>
                </svg>
                <span>Горизонтальное отражение</span>
              </div>

              <div className={activeTool === 'flipVertical' ? 'active' : ''} onClick={() => { setFlipVertical(!flipVertical); setPreviewMode(true); setHasChange(true); }}>                    
                <svg width="35px" height="35px" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M7.49976 4.25001C7.91398 4.25001 8.24976 4.5858 8.24976 5.00001L8.24976 17.2266L10.4775 15.0636C10.7747 14.775 11.2495 14.782 11.538 15.0792C11.8266 15.3763 11.8196 15.8512 11.5224 16.1397L8.02243 19.5381C7.73142 19.8207 7.26851 19.8207 6.9775 19.5381L3.47751 16.1397C3.18034 15.8512 3.17335 15.3763 3.4619 15.0792C3.75044 14.782 4.22527 14.775 4.52244 15.0636L6.74976 17.2262L6.74976 5.00001C6.74976 4.5858 7.08555 4.25001 7.49976 4.25001Z"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M15.9773 4.4619C16.2683 4.17934 16.7312 4.17934 17.0222 4.4619L20.5222 7.86029C20.8193 8.14884 20.8263 8.62366 20.5378 8.92083C20.2492 9.21801 19.7744 9.225 19.4772 8.93645L17.2497 6.7736L17.2497 19C17.2497 19.4142 16.9139 19.75 16.4997 19.75C16.0855 19.75 15.7497 19.4142 15.7497 19L15.7497 6.77358L13.5222 8.93645C13.225 9.225 12.7502 9.21801 12.4616 8.92083C12.1731 8.62366 12.1801 8.14884 12.4773 7.86029L15.9773 4.4619Z"/>
                </svg>
                <span>Вертикальное отражение</span>
              </div>
            </div>
        );
      
      case 'parameters':
        return (
          <div className="Tools-parameters">
              <div className="range">
                <label htmlFor="range-line">{paramLabel}</label>
                <input id="range-line" type="range" min={paramMin} max={paramMax} value={paramValue} onChange={paramChange} />
                <span>{paramValue}</span>
              </div>
              <div>

              </div>
              <div className="Tools">
              <div className={currentParam === 'brightness' ? 'active' : ''} onClick={() => selectParameter('brightness')}>                                     
                <svg width="35px" height="35px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-brightness-high">
                  <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
                </svg>
                <span>Яркость</span>          
              </div>

              <div className={currentParam === 'contrast' ? 'active' : ''} onClick={() => selectParameter('contrast')}>                                                  
                <svg fill="currentColor" width="35px" height="35px" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="M256,32A224,224,0,0,0,97.61,414.39,224,224,0,1,0,414.39,97.61,222.53,222.53,0,0,0,256,32ZM64,256C64,150.13,150.13,64,256,64V448C150.13,448,64,361.87,64,256Z"/></svg>
                <span>Контраст</span>            
              </div>
              <div className={currentParam === 'saturation' ? 'active' : ''} onClick={() => selectParameter('saturation')}>                                                                                             
              <svg fill="currentColor" width="35px" height="35px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M20,7.87279794 C19.4940015,6.89397574 18.8136364,6.01990475 18,5.29168048 L18,18.7083195 C18.8136364,17.9800953 19.4940015,17.1060243 20,16.1272021 L20,7.87279794 Z M16,3.93551965 C15.3714959,3.62317975 14.7013005,3.38214996 14,3.22301642 L14,20.7769836 C14.7013005,20.61785 15.3714959,20.3768202 16,20.0644804 L16,3.93551965 Z M12,3 C7.02943725,3 3,7.02943725 3,12 C3,16.9705627 7.02943725,21 12,21 L12,3 Z M12,23 C5.92486775,23 1,18.0751322 1,12 C1,5.92486775 5.92486775,1 12,1 C18.0751322,1 23,5.92486775 23,12 C23,18.0751322 18.0751322,23 12,23 Z"/>
              </svg>                           
                <span>Насыщенность</span>            
              </div>
              <div className={currentParam === 'blur' ? 'active' : ''} onClick={() => selectParameter('blur')}>                                             
                <svg width="35px" height="35px" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                  <path fill="var(--ci-primary-color, currentColor)" d="M394.633,220.663,269.475,25.174a16,16,0,0,0-26.95,0L117.364,220.665A170.531,170.531,0,0,0,84.1,322.3c0,94.785,77.113,171.9,171.9,171.9s171.9-77.113,171.9-171.9A170.519,170.519,0,0,0,394.633,220.663ZM256,462.2c-77.14,0-139.9-62.758-139.9-139.9a138.758,138.758,0,0,1,27.321-83.058q.319-.432.608-.884L256,63.475,367.967,238.359q.288.453.608.884A138.754,138.754,0,0,1,395.9,322.3C395.9,399.441,333.14,462.2,256,462.2Z" class="ci-primary"/>
                </svg>
                 <span>Размытие</span>           
              </div>

              <div className={currentParam === 'hue' ? 'active' : ''} onClick={() => selectParameter('hue')}>                    
                <svg fill="none" stroke="currentColor" strokeWidth="1.5" width="35px" height="35px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z"></path>
                    <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"></circle>
                    <circle cx="12" cy="7.5" r="1.5" fill="currentColor" stroke="none"></circle>
                    <circle cx="16.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"></circle>
                </svg>
                <span>Оттенок</span>              
              </div>
            </div>
          </div>
        );
      
      case 'filters':
        return (
          <div className="Tools">
            <div className={currentParam === 'none' ? 'active' : ''} onClick={() => applyFilterSet('none')}>Оригинал</div>
            <div className={currentParam === 'grayscale' ? 'active' : ''} onClick={() => applyFilterSet('grayscale')}>ЧБ</div>
            <div className={currentParam === 'warm' ? 'active' : ''} onClick={() => applyFilterSet('warm')}>Тёплый</div>
            <div className={currentParam === 'cold' ? 'active' : ''} onClick={() => applyFilterSet('cold')}>Холодный</div>
            <div className={currentParam === 'soft' ? 'active' : ''} onClick={() => applyFilterSet('soft')}>Эффектный</div>
            <div className={currentParam === 'invert' ? 'active' : ''} onClick={() => applyFilterSet('invert')}>Инверсия</div>
          </div>
        );
      
      case 'resize':
        return (
          <div className="Tools">
              <div className="width">
                <label htmlFor="width">Ширина</label>
                <input id="width" type="number" max={9999} min={10} value={width} onChange={toolChangeWidth}></input>
                <span>px</span>
              </div>
              <button className="lock" onClick={clickLock}>
                {sizeLock ?                    
                  <svg width="35px" height="35px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="10" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 6C6 4.34315 7.34315 3 9 3H15C16.6569 3 18 4.34315 18 6V10H6V6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>             
                :                 
                  <svg width="35px" height="35px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="10" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 10V5C6 3.34315 7.34315 2 9 2H15C16.6569 2 18 3.34315 18 5V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
              </button>
              <div className="height">
                <label htmlFor="height">Высота</label>
                <input className="height" type="number" max={9999} min={10} onChange={toolChangeHeight} value={height}></input>
                <span>px</span>
              </div>

              <div className="default" onClick={defaultSize}>                     
                <svg fill="currentColor" width="40px" height="40px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5,6.3422181 C6.68697264,4.25541041 9.23673432,3 12,3 C16.9705627,3 21,7.02943725 21,12 C21,16.9705627 16.9705627,21 12,21 C7.23546573,21 3.30392987,17.2866561 3.01673028,12.5530434 C3.00000681,12.2774079 3.2098965,12.0404041 3.48553201,12.0236806 C3.76116753,12.0069572 3.99817131,12.2168469 4.01489477,12.4924824 C4.27011855,16.6990708 7.76500658,20 12,20 C16.418278,20 20,16.418278 20,12 C20,7.581722 16.418278,4 12,4 C9.53058015,4 7.25395153,5.12713252 5.75425065,7 L8.5,7 C8.77614237,7 9,7.22385763 9,7.5 C9,7.77614237 8.77614237,8 8.5,8 L4.5,8 C4.22385763,8 4,7.77614237 4,7.5 L4,3.5 C4,3.22385763 4.22385763,3 4.5,3 C4.77614237,3 5,3.22385763 5,3.5 L5,6.3422181 Z"/>
                </svg>              
              </div>
              {sizeChanges && (<button onClick={() => applyFilter(width, height)} className="Btn" style={{border: 'none'}}>Применить изменения</button>)}
            </div>
        );
    }
  }







 
  



  async function openModal() {
    if (!originalImg) {
      alert('Сначала загрузите изображение');
      return;
    }

    if (currentImage && (brightness !== 0 || contrast !== 0 || saturation !== 0 || blur !== 0 || hue !== 0)) {
      await applyFilter(width, height);
    }

    setModalName(`save_${Date.now()}`);
    setModalWidth(width || imageSize.width);
    setModalHeight(height || imageSize.height);

    setModalOpen(true);
    document.body.style.overflow = 'auto';
  }

  function closeModal() {
    setModalOpen(false);
    document.body.style.overflow = 'auto';
  }

  async function saveImg() {
    const save = {
      path: currentImage,
      name: modalName,
      format: modalFormat,
      width: modalWidth,
      height: modalHeight,
      params: {
        brightness,
        contrast,
        saturation,
        blur,
        hue
      }
    };
    console.log('Сохраняем:', save);

    try {
      const res = await fetch('http://localhost:3001/file/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(save)
      });

      if (res.ok) {
        const blob = await res.blob();

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${modalName}.${modalFormat.toLowerCase()}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
          
        const conf = window.confirm('Файл скачан. Хотите загрузить новое изображение?');

        if (conf) {
          setVersions([]);
          setCurrentImage(null);
          setCurrentVersion(-1);

          setBrightness(0);
          setContrast(0);
          setSaturation(0);
          setBlur(0);
          setHue(0);
          setParamValue(0);

          setWidth(null);
          setHeight(null);

          setPreviewMode(false);
          setHasChange(false);
          setSizeChanges(false);
        }
      }
      else {
        const error = await res.json();
            console.error('Ошибка сервера:', error);
            alert('Ошибка: ' + error.message);
      }
    }

    catch(error) {
      console.error('Ошибка:', error);
      alert('Не удалось сохранить изображение')
    }

    closeModal();
  }

  function clickLock() {
    setModalLock(!modalLock);
    setSizeLock(!sizeLock);
  }

  function changeWidth (e) {
    const newW = Number(e.target.value);
    setModalWidth(newW);

    if (modalLock && imageSize.width > 0) {
      const newH = Math.round((newW / imageSize.width) * imageSize.height);
      setModalHeight(newH);
    }
  }

  function changeHeight (e) {
    const newH = Number(e.target.value);
    setModalHeight(newH);

    if (modalLock && imageSize.height > 0) {
      const newW = Math.round((newH / imageSize.height) * imageSize.width);
      setModalWidth(newW);
    }
  }

   


 

  return (
    <div className="App">


      <div className="Header">
        <h2>Image Editor</h2>
        <a className="Git" href="https://github.com/maximka35Reg/image-editor">                            
          <svg fill="currentColor" width="30px" height="30px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M12.026 2c-5.509 0-9.974 4.465-9.974 9.974 0 4.406 2.857 8.145 6.821 9.465.499.09.679-.217.679-.481 0-.237-.008-.865-.011-1.696-2.775.602-3.361-1.338-3.361-1.338-.452-1.152-1.107-1.459-1.107-1.459-.905-.619.069-.605.069-.605 1.002.07 1.527 1.028 1.527 1.028.89 1.524 2.336 1.084 2.902.829.091-.645.351-1.085.635-1.334-2.214-.251-4.542-1.107-4.542-4.93 0-1.087.389-1.979 1.024-2.675-.101-.253-.446-1.268.099-2.64 0 0 .837-.269 2.742 1.021a9.582 9.582 0 0 1 2.496-.336 9.554 9.554 0 0 1 2.496.336c1.906-1.291 2.742-1.021 2.742-1.021.545 1.372.203 2.387.099 2.64.64.696 1.024 1.587 1.024 2.675 0 3.833-2.33 4.675-4.552 4.922.355.308.675.916.675 1.846 0 1.334-.012 2.41-.012 2.737 0 .267.178.577.687.479C19.146 20.115 22 16.379 22 11.974 22 6.465 17.535 2 12.026 2z"/></svg>                          
          <h3>GitHub</h3>
        </a>
      </div>


      <div className="WorkPanel">
        <div className="HeaderWorkPanel">
          <a className="Btn" title="Сохранить изображение на компьютер" onClick={openModal}>Сохранить</a>

          <div className="ReturnButtons">
            {hasChange && (<button onClick={() => applyFilter(width, height)} className="Btn" style={{border: 'none'}}>Применить изменения</button>)}
            <div onClick={resetChanges}>
              <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="none" viewBox="0 0 128 128" id="refresh">
                <path stroke="#000" strokeLinecap="round" strokeWidth="5" d="M26 64.5C26 43.237 43.237 26 64.5 26 76.4556 26 87.1383 31.4495 94.1999 40M102.979 64.5C102.979 85.763 85.742 103 64.479 103 52.5234 103 41.8407 97.5505 34.7791 89M25.0846 97.0845V81.4154C25.0846 78.9301 27.0993 76.9154 29.5846 76.9154L44.9152 76.9154M104 32V47.6691C104 50.1544 101.985 52.1691 99.4999 52.1691L84.1692 52.1691"></path>
              </svg>
            </div>
            <div onClick={goPrev}>                         
              <svg width="100%" height="100%" viewBox="-0.5 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.2741 11.725L6.54411 7.93501C6.35411 7.74501 6.35411 7.42501 6.54411 7.23501L10.2741 3.44501" stroke="#0F0F0F" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.9241 21.555C15.7141 20.815 18.1941 17.095 17.4741 13.235C16.7541 9.37501 13.0941 6.84501 9.30408 7.58501" stroke="#0F0F0F" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div onClick={goNext}>                             
              <svg width="100%" height="100%" viewBox="-0.5 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.726 11.735L17.456 7.945C17.646 7.755 17.646 7.435 17.456 7.245L13.726 3.435" stroke="#0F0F0F" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12.0759 21.565C8.28595 20.825 5.80595 17.105 6.52595 13.245C7.24595 9.38501 10.9059 6.855 14.6959 7.595" stroke="#0F0F0F" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <div className={`overlay ${modalOpen ? 'active' : ''}`} onClick={closeModal}></div>

        <div className={`saveImg ${modalOpen ? 'active' : ''}`}>
          <div className="icon">                    
            <svg width="55px" height="55px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 11C3 7.22876 3 5.34315 4.17157 4.17157C5.34315 3 7.22876 3 11 3H13C16.7712 3 18.6569 3 19.8284 4.17157C21 5.34315 21 7.22876 21 11V13C21 16.7712 21 18.6569 19.8284 19.8284C18.6569 21 16.7712 21 13 21H11C7.22876 21 5.34315 21 4.17157 19.8284C3 18.6569 3 16.7712 3 13V11Z" stroke="currentColor"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M18.9976 14.2904L18.6544 13.9471L18.6385 13.9313C18.238 13.5307 17.9149 13.2077 17.6314 12.9687C17.3394 12.7226 17.055 12.5353 16.7221 12.4349C16.2512 12.2928 15.7488 12.2928 15.2779 12.4349C14.945 12.5353 14.6606 12.7226 14.3686 12.9687C14.0851 13.2077 13.762 13.5307 13.3615 13.9313L13.3456 13.9471C13.0459 14.2469 12.8458 14.4462 12.6832 14.5807C12.5218 14.7142 12.452 14.7359 12.4237 14.7408C12.3029 14.762 12.1785 14.7381 12.0742 14.6735C12.0498 14.6584 11.993 14.6123 11.8928 14.4285C11.7917 14.2432 11.68 13.9838 11.513 13.5942L11.4596 13.4696L11.4475 13.4414L11.4475 13.4414C11.0829 12.5907 10.7931 11.9144 10.5107 11.4126C10.2237 10.9026 9.90522 10.4984 9.44575 10.268C9.03426 10.0618 8.57382 9.97308 8.11515 10.0118C7.603 10.055 7.15716 10.3121 6.70134 10.6789C6.25273 11.04 5.73245 11.5603 5.07799 12.2148L5.07798 12.2148L5.05634 12.2364L5 12.2928V12.9999C5 13.2462 5.00007 13.4816 5.00044 13.7065L5.76344 12.9435C6.44443 12.2626 6.92686 11.7811 7.32835 11.458C7.72756 11.1366 7.98255 11.0265 8.19924 11.0082C8.47444 10.985 8.75071 11.0382 8.9976 11.162C9.192 11.2594 9.38786 11.4564 9.63918 11.903C9.89194 12.3521 10.1611 12.9783 10.5404 13.8635L10.5938 13.9881L10.6034 14.0105L10.6034 14.0105C10.7583 14.3719 10.8884 14.6754 11.0149 14.9073C11.1448 15.1455 11.3038 15.3727 11.5479 15.5238C11.8608 15.7175 12.2341 15.7894 12.5966 15.7258C12.8794 15.6761 13.1114 15.5242 13.3204 15.3513C13.524 15.183 13.7575 14.9495 14.0355 14.6714L14.0527 14.6542C14.4728 14.2341 14.766 13.9416 15.013 13.7334C15.2553 13.5292 15.4185 13.437 15.5667 13.3922C15.8493 13.307 16.1507 13.307 16.4333 13.3922C16.5815 13.437 16.7447 13.5292 16.987 13.7334C17.234 13.9416 17.5272 14.2341 17.9473 14.6542L18.9755 15.6825C18.9887 15.2721 18.9948 14.812 18.9976 14.2904Z" fill="currentColor"/>
            <circle cx="16.5" cy="7.5" r="1.5" fill="currentColor"/>
            </svg>              
          </div>
          <div className="saveInfo">
            <label htmlFor="name">Имя</label>
            <input id="name" type="text" placeholder="Name123" value={modalName} onChange={(e) => setModalName(e.target.value)}></input>
            <label htmlFor="format">Формат</label>
            <select id="format" value={modalFormat} onChange={(e) => setModalFormat(e.target.value)}>
              <option>JPEG</option>
              <option>JPG</option>
              <option>PNG</option>
              <option>WEBP</option>
            </select>
            <label htmlFor="resize">Размер</label>
          </div>
          <div id="resize">
            <div>
              <label htmlFor="width">Ширина</label>
              <input id="width" type="number" max={9999} min={10} value={modalWidth} onChange={changeWidth}></input>
            </div>
            <button className="lock" onClick={clickLock}>
              {modalLock ?                    
                <svg width="35px" height="35px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="10" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 6C6 4.34315 7.34315 3 9 3H15C16.6569 3 18 4.34315 18 6V10H6V6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>             
               :                 
                <svg width="35px" height="35px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="10" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 10V5C6 3.34315 7.34315 2 9 2H15C16.6569 2 18 3.34315 18 5V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            </button>
            <div>
              <label htmlFor="height">Высота</label>
              <input className="height" type="number" max={9999} min={10} onChange={changeHeight} value={modalHeight}></input>
            </div>
          </div>
          <div className="btnsModal">
            <button className="close Btn" onClick={closeModal}>Отмена</button>
            <button className="save Btn" onClick={saveImg}>Сохранить</button>
          </div>
        </div>


        <div className="Sandbox">
          <div className="Aside">
            <div className={active === 'crop' ? 'active' : ''} onClick={() => setActive('crop')}>                     
              <svg width="30px" height="30px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="miter"><polyline points="22 19 5 19 5 2"></polyline><polyline points="9 5 19 5 19 15"></polyline><line x1="19" y1="19" x2="19" y2="22"></line><line x1="2" y1="5" x2="5" y2="5"></line></svg>           
              <h3>Обрезка</h3>
            </div>

            <div className={active === 'parameters' ? 'active' : ''} onClick={() => setActive('parameters')}>                   
              <svg width="30px" height="30px" viewBox="0 0 32 32" id="i-options" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentcolor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                  <path d="M28 6 L4 6 M28 16 L4 16 M28 26 L4 26 M24 3 L24 9 M8 13 L8 19 M20 23 L20 29" />
              </svg>                  
              <h3>Параметры</h3>
            </div>

            <div className={active === 'filters' ? 'active' : ''} onClick={() => setActive('filters')}>                                                                     
              <svg fill="currentColor" width="30px" height="30px" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.9637413,47.5058136 C18.1708495,47.5058136 20.2381268,47.0900826 22.1655731,46.2586205 C24.0930195,45.4271895 25.7899222,44.2820638 27.2562812,42.8232436 C28.7226711,41.3644327 29.8678045,39.667527 30.6916813,37.7325263 C31.5155581,35.7975164 31.9274965,33.7264574 31.9274965,31.5193492 C31.9274965,29.3273495 31.511781,27.267642 30.6803499,25.3402265 C29.8488879,23.4127801 28.7037545,21.7196546 27.2449498,20.2608499 C25.7861451,18.8020142 24.0930195,17.6568808 22.1655731,16.8254497 C20.2381268,15.9940186 18.1708495,15.5783031 15.9637413,15.5783031 C13.7717726,15.5783031 11.7082879,15.9940186 9.77328728,16.8254497 C7.83828664,17.6568808 6.14136848,18.8020142 4.6825328,20.2608499 C3.22372809,21.7196546 2.07861019,23.4127801 1.24717912,25.3402265 C0.415726372,27.267642 0,29.3273495 0,31.5193492 C0,33.7264574 0.415726372,35.7975164 1.24717912,37.7325263 C2.07861019,39.667527 3.22372809,41.3644327 4.6825328,42.8232436 C6.14136848,44.2820638 7.83828664,45.4271895 9.77328728,46.2586205 C11.7082879,47.0900826 13.7717726,47.5058136 15.9637413,47.5058136 Z M15.9637413,43.8776642 C14.2706312,43.8776642 12.6757727,43.5564247 11.1791659,42.9139456 C9.68255897,42.2714635 8.36736225,41.3871074 7.23357572,40.2608773 C6.09978919,39.1346459 5.21543198,37.8232299 4.58050409,36.3266292 C3.9455762,34.8300254 3.62811226,33.2275987 3.62811226,31.5193492 C3.62811226,29.8262391 3.9455762,28.2351577 4.58050409,26.7461051 C5.21543198,25.2570525 6.09978919,23.94941 7.23357572,22.8231777 C8.36736225,21.6969454 9.68255897,20.8125882 11.1791659,20.1701061 C12.6757727,19.5276549 14.2706312,19.2064293 15.9637413,19.2064293 C17.6719908,19.2064293 19.2706419,19.5276549 20.7596946,20.1701061 C22.2487472,20.8125882 23.5563742,21.6969454 24.6825755,22.8231777 C25.8088078,23.94941 26.693165,25.2570525 27.3356472,26.7461051 C27.9781293,28.2351577 28.2993704,29.8262391 28.2993704,31.5193492 C28.2993704,33.2275987 27.9781293,34.8300254 27.3356472,36.3266292 C26.693165,37.8232299 25.8088078,39.1346459 24.6825755,40.2608773 C23.5563742,41.3871074 22.2487472,42.2714635 20.7596946,42.9139456 C19.2706419,43.5564247 17.6719908,43.8776642 15.9637413,43.8776642 Z M25.0114173,31.9275105 C27.203386,31.9275105 29.2630936,31.5155721 31.1905399,30.6916952 C33.1179863,29.8678184 34.814889,28.722685 36.281248,27.2562951 C37.7476379,25.7899361 38.8927713,24.0930335 39.7166481,22.1655871 C40.5405249,20.2381407 40.9524634,18.1708634 40.9524634,15.9637552 C40.9524634,13.7566471 40.5405249,11.6931624 39.7166481,9.77330121 C38.8927713,7.85340906 37.7476379,6.1602835 36.281248,4.69392454 C34.814889,3.22753462 33.1179863,2.07862412 31.1905399,1.24719305 C29.2630936,0.415731016 27.203386,0 25.0114173,0 C22.8043091,0 20.7370318,0.415731016 18.8095854,1.24719305 C16.882139,2.07862412 15.1852209,3.22753462 13.718831,4.69392454 C12.252472,6.1602835 11.103577,7.85340906 10.2721459,9.77330121 C9.44068389,11.6931624 9.02495287,13.7566471 9.02495287,15.9637552 C9.02495287,18.1708634 9.44068389,20.2381407 10.2721459,22.1655871 C11.103577,24.0930335 12.252472,25.7899361 13.718831,27.2562951 C15.1852209,28.722685 16.882139,29.8678184 18.8095854,30.6916952 C20.7370318,31.5155721 22.8043091,31.9275105 25.0114173,31.9275105 Z M25.0114173,28.2993843 C23.3031678,28.2993843 21.7007396,27.9819203 20.2041327,27.3469925 C18.7075258,26.7120955 17.3961062,25.8277538 16.2698739,24.6939673 C15.1436416,23.5601498 14.2592844,22.2487302 13.6168023,20.7597085 C12.9743201,19.2706558 12.6530791,17.6720048 12.6530791,15.9637552 C12.6530791,14.2555367 12.9743201,12.6606782 13.6168023,11.1791798 C14.2592844,9.69768138 15.1436416,8.39003891 16.2698739,7.25625238 C17.3961062,6.12246585 18.7075258,5.23433152 20.2041327,4.59184939 C21.7007396,3.94936726 23.3031678,3.62812619 25.0114173,3.62812619 C26.7045274,3.62812619 28.2956087,3.94936726 29.7846614,4.59184939 C31.2736831,5.23433152 32.5851026,6.11868873 33.7189201,7.24492102 C34.8527067,8.37115331 35.7370484,9.67879578 36.3719453,11.1678484 C37.0068732,12.6569011 37.3243372,14.2555367 37.3243372,15.9637552 C37.3243372,17.6720048 37.0068732,19.2706558 36.3719453,20.7597085 C35.7370484,22.2487302 34.8527067,23.5601498 33.7189201,24.6939673 C32.5851026,25.8277538 31.2736831,26.7120955 29.7846614,27.3469925 C28.2956087,27.9819203 26.7045274,28.2993843 25.0114173,28.2993843 Z M34.0590468,47.5058136 C36.2510465,47.5058136 38.310754,47.0900826 40.2381695,46.2586205 C42.165523,45.4271895 43.8624876,44.2820638 45.3290633,42.8232436 C46.7953293,41.3644327 47.9403853,39.667527 48.7642312,37.7325263 C49.5880771,35.7975164 50,33.7264574 50,31.5193492 C50,29.3273495 49.5880771,27.267642 48.7642312,25.3402265 C47.9403853,23.4127801 46.7953293,21.7196546 45.3290633,20.2608499 C43.8624876,18.8020142 42.165523,17.6568808 40.2381695,16.8254497 C38.310754,15.9940186 36.2510465,15.5783031 34.0590468,15.5783031 C31.8519386,15.5783031 29.7808842,15.9940186 27.8458836,16.8254497 C25.910883,17.6568808 24.2139803,18.8020142 22.7551756,20.2608499 C21.2963399,21.7196546 20.1512065,23.4127801 19.3197754,25.3402265 C18.4883134,27.267642 18.0725824,29.3273495 18.0725824,31.5193492 C18.0725824,33.7264574 18.4883134,35.7975164 19.3197754,37.7325263 C20.1512065,39.667527 21.2963399,41.3644327 22.7551756,42.8232436 C24.2139803,44.2820638 25.910883,45.4271895 27.8458836,46.2586205 C29.7808842,47.0900826 31.8519386,47.5058136 34.0590468,47.5058136 Z M34.0590468,43.8776642 C32.3507973,43.8776642 30.7483691,43.5564247 29.2517622,42.9139456 C27.7551553,42.2714635 26.4437357,41.3871074 25.3175034,40.2608773 C24.1912711,39.1346459 23.3069139,37.8232299 22.6644318,36.3266292 C22.0219806,34.8300254 21.700755,33.2275987 21.700755,31.5193492 C21.700755,29.8262391 22.0219806,28.2351577 22.6644318,26.7461051 C23.3069139,25.2570525 24.1912711,23.94941 25.3175034,22.8231777 C26.4437357,21.6969454 27.7551553,20.8125882 29.2517622,20.1701061 C30.7483691,19.5276549 32.3507973,19.2064293 34.0590468,19.2064293 C35.7521569,19.2064293 37.3432382,19.5276549 38.8322909,20.1701061 C40.3213435,20.8125882 41.6290325,21.6969454 42.7553576,22.8231777 C43.8813732,23.94941 44.7657459,25.2570525 45.4084757,26.7461051 C46.0508959,28.2351577 46.372106,29.8262391 46.372106,31.5193492 C46.372106,33.2275987 46.0546111,34.8300254 45.4196213,36.3266292 C44.7846315,37.8232299 43.903974,39.1346459 42.7776488,40.2608773 C41.6515713,41.3871074 40.3402291,42.2714635 38.8436223,42.9139456 C37.3470154,43.5564247 35.7521569,43.8776642 34.0590468,43.8776642 Z" transform="translate(3 4)"/>
              </svg>                                                    
              <h3>Фильтры</h3>
            </div>
            <div className={active === 'resize' ? 'active' : ''} onClick={() => setActive('resize')}>                        
              <svg fill="currentColor" width="30px" height="30px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M4,14.5 L4,18.5 C4,19.3284271 4.67157288,20 5.5,20 L9.5,20 C10.3284271,20 11,19.3284271 11,18.5 L11,14.5 C11,13.6715729 10.3284271,13 9.5,13 L5.5,13 C4.67157288,13 4,13.6715729 4,14.5 Z M16.2928932,16 L15.1464466,14.8535534 C14.9511845,14.6582912 14.9511845,14.3417088 15.1464466,14.1464466 C15.3417088,13.9511845 15.6582912,13.9511845 15.8535534,14.1464466 L17.8535534,16.1464466 C18.0488155,16.3417088 18.0488155,16.6582912 17.8535534,16.8535534 L15.8535534,18.8535534 C15.6582912,19.0488155 15.3417088,19.0488155 15.1464466,18.8535534 C14.9511845,18.6582912 14.9511845,18.3417088 15.1464466,18.1464466 L16.2928932,17 L13.5,17 C13.2238576,17 13,16.7761424 13,16.5 C13,16.2238576 13.2238576,16 13.5,16 L16.2928932,16 L16.2928932,16 Z M8,7.70710678 L8,10.5 C8,10.7761424 7.77614237,11 7.5,11 C7.22385763,11 7,10.7761424 7,10.5 L7,7.70710678 L5.85355339,8.85355339 C5.65829124,9.04881554 5.34170876,9.04881554 5.14644661,8.85355339 C4.95118446,8.65829124 4.95118446,8.34170876 5.14644661,8.14644661 L7.14644661,6.14644661 C7.34170876,5.95118446 7.65829124,5.95118446 7.85355339,6.14644661 L9.85355339,8.14644661 C10.0488155,8.34170876 10.0488155,8.65829124 9.85355339,8.85355339 C9.65829124,9.04881554 9.34170876,9.04881554 9.14644661,8.85355339 L8,7.70710678 Z M3,14.5 C3,13.1192881 4.11928813,12 5.5,12 L9.5,12 C10.8807119,12 12,13.1192881 12,14.5 L12,18.5 C12,19.8807119 10.8807119,21 9.5,21 L5.5,21 C4.11928813,21 3,19.8807119 3,18.5 L3,14.5 Z M4,5.5 C4,5.77614237 3.77614237,6 3.5,6 C3.22385763,6 3,5.77614237 3,5.5 C3,4.11928813 4.11928813,3 5.5,3 C5.77614237,3 6,3.22385763 6,3.5 C6,3.77614237 5.77614237,4 5.5,4 C4.67157288,4 4,4.67157288 4,5.5 Z M8.5,4 C8.22385763,4 8,3.77614237 8,3.5 C8,3.22385763 8.22385763,3 8.5,3 L10.5,3 C10.7761424,3 11,3.22385763 11,3.5 C11,3.77614237 10.7761424,4 10.5,4 L8.5,4 Z M13.5,4 C13.2238576,4 13,3.77614237 13,3.5 C13,3.22385763 13.2238576,3 13.5,3 L15.5,3 C15.7761424,3 16,3.22385763 16,3.5 C16,3.77614237 15.7761424,4 15.5,4 L13.5,4 Z M18.5,4 C18.2238576,4 18,3.77614237 18,3.5 C18,3.22385763 18.2238576,3 18.5,3 C19.8807119,3 21,4.11928813 21,5.5 C21,5.77614237 20.7761424,6 20.5,6 C20.2238576,6 20,5.77614237 20,5.5 C20,4.67157288 19.3284271,4 18.5,4 Z M20,8.5 C20,8.22385763 20.2238576,8 20.5,8 C20.7761424,8 21,8.22385763 21,8.5 L21,10.5 C21,10.7761424 20.7761424,11 20.5,11 C20.2238576,11 20,10.7761424 20,10.5 L20,8.5 Z M20,13.5 C20,13.2238576 20.2238576,13 20.5,13 C20.7761424,13 21,13.2238576 21,13.5 L21,15.5 C21,15.7761424 20.7761424,16 20.5,16 C20.2238576,16 20,15.7761424 20,15.5 L20,13.5 Z M20,18.5 C20,18.2238576 20.2238576,18 20.5,18 C20.7761424,18 21,18.2238576 21,18.5 C21,19.8807119 19.8807119,21 18.5,21 C18.2238576,21 18,20.7761424 18,20.5 C18,20.2238576 18.2238576,20 18.5,20 C19.3284271,20 20,19.3284271 20,18.5 Z M15.5,20 C15.7761424,20 16,20.2238576 16,20.5 C16,20.7761424 15.7761424,21 15.5,21 L13.5,21 C13.2238576,21 13,20.7761424 13,20.5 C13,20.2238576 13.2238576,20 13.5,20 L15.5,20 Z M3,8.5 C3,8.22385763 3.22385763,8 3.5,8 C3.77614237,8 4,8.22385763 4,8.5 L4,10.5 C4,10.7761424 3.77614237,11 3.5,11 C3.22385763,11 3,10.7761424 3,10.5 L3,8.5 Z"/>
              </svg>               
              <h3>Размер</h3>
            </div>
          </div>

          
          <div className="Work">
            <div className="Canvas">
              {!currentImage ? (
                <div>
                  <p>Загрузите изображение, чтобы начать</p>
                  <input type="file" id="fileInput" accept="image/*" 
                    style={{ display: 'none' }} onChange={fileUpload}/>
                  <button className="Btn-select" onClick={() => document.getElementById('fileInput').click()} >Выбрать файл</button>
                </div>
              ) : (
                 isCropping ? (
            <ReactCrop crop={crop} onChange={setCrop}>
                <img 
                    ref={imgRef}
                    src={currentImage} 
                    style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
                />
            </ReactCrop>
        ) : (
            <img 
                src={currentImage} 
                style={previewMode ? preview() : {}}
            />
        )
              )}
            </div>

            {tools()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
