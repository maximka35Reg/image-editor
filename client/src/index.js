// ТОЧКА ВХОДА В ПРИЛОЖЕНИЕ

import React from 'react'; // подключение react из библиотеки (компоненты, хуки и прочее)
import ReactDOM from 'react-dom/client'; // билиотека для связи react с dom браузера
import App from './App'; // подключение основного компонента приложения (App.js)

// Создаём точку управления привязанную к элементу страницы в котором будет работать React и управлять всем
const root = ReactDOM.createRoot(document.getElementById('root'));

// Вызов компонента App, его запуск, 
// генерация содержимого страницы и 
// вставка результата в root элемент страницы
root.render(
    <App />
); 

