import React, { useState } from "react";
import './App.css'

function App() {
  return (
    <div className="App">
      <div className="Header">
        <h2>🎨 Редактор изображений</h2>
        <div>
          <button className="btn">Загрузить</button>
          <button className="btn">Сохранить</button>
        </div>
      </div>
      <div className="Main">
        <aside className="Aside">
          <h3>Инструменты</h3>
          <div className="tool-group">
            <h4>Фильтры</h4>
            <button className="tool-btn">Ч/Б</button>
            <button className="tool-btn">Сепия</button>
            <button className="tool-btn">Размытие</button>
          </div>
          <div className="tool-group">
            <h4>Обрезка</h4>
            <button className="tool-btn">Выбрать область</button>
          </div>
        </aside>
        <div className="WorkPanel">
          <div className="Canvas">Рабочая область</div>
          <div className="ToolBar">П
            <button className="tool-btn">↩ Отмена</button>
            <button className="tool-btn">↪ Повтор</button>
            <button className="tool-btn">✂️ Обрезать</button>
            <button className="tool-btn">📏 Размер</button>
            <button className="tool-btn">🖌️ Поворот</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
