import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useKeyPress } from '../../hooks/useKeyPress';
import './PresentationMode.css';

/**
 * 演示文稿模式组件
 * 支持幻灯片播放、动画效果、演讲者备注
 */
const PresentationMode = ({ slides, onExit, theme = 'dark' }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [transition, setTransition] = useState('fade');
  const timerRef = useRef(null);

  const totalSlides = slides.length;

  // 键盘导航
  const nextSlide = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide, totalSlides]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  const goToSlide = useCallback((index) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
      setShowOverview(false);
    }
  }, [totalSlides]);

  // 键盘事件
  useKeyPress('ArrowRight', nextSlide);
  useKeyPress('ArrowDown', nextSlide);
  useKeyPress(' ', nextSlide);
  useKeyPress('ArrowLeft', prevSlide);
  useKeyPress('ArrowUp', prevSlide);
  useKeyPress('Escape', () => {
    if (showOverview) {
      setShowOverview(false);
    } else if (showNotes) {
      setShowNotes(false);
    } else {
      onExit?.();
    }
  });
  useKeyPress('n', () => setShowNotes(prev => !prev));
  useKeyPress('o', () => setShowOverview(prev => !prev));
  useKeyPress('f', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  // 自动播放
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentSlide(prev => {
          if (prev >= totalSlides - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 5000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, totalSlides]);

  // 当前幻灯片
  const slide = slides[currentSlide];

  return (
    <div className={`presentation-mode ${theme}`}>
      {/* 主幻灯片区域 */}
      <div className={`slide-container ${transition}`}>
        <div className="slide-content">
          {slide.type === 'title' && (
            <div className="slide-title-layout">
              <h1>{slide.title}</h1>
              {slide.subtitle && <h2>{slide.subtitle}</h2>}
              {slide.author && <p className="slide-author">{slide.author}</p>}
            </div>
          )}

          {slide.type === 'content' && (
            <div className="slide-content-layout">
              <h2>{slide.title}</h2>
              <div className="slide-body">
                {slide.content}
              </div>
            </div>
          )}

          {slide.type === 'image' && (
            <div className="slide-image-layout">
              <h2>{slide.title}</h2>
              <div className="slide-image">
                <img src={slide.imageUrl} alt={slide.title} />
              </div>
              {slide.caption && <p className="slide-caption">{slide.caption}</p>}
            </div>
          )}

          {slide.type === 'chart' && (
            <div className="slide-chart-layout">
              <h2>{slide.title}</h2>
              <div className="slide-chart">
                {slide.chartComponent}
              </div>
            </div>
          )}

          {slide.type === 'cesium' && (
            <div className="slide-cesium-layout">
              <div className="cesium-viewport">
                {slide.cesiumComponent}
              </div>
              <div className="slide-overlay">
                <h2>{slide.title}</h2>
                {slide.description && <p>{slide.description}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 演讲者备注 */}
      {showNotes && slide.notes && (
        <div className="speaker-notes">
          <h4>演讲者备注</h4>
          <p>{slide.notes}</p>
        </div>
      )}

      {/* 幻灯片概览 */}
      {showOverview && (
        <div className="slide-overview">
          <div className="overview-grid">
            {slides.map((s, index) => (
              <div
                key={index}
                className={`overview-item ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
              >
                <div className="overview-number">{index + 1}</div>
                <div className="overview-preview">
                  {s.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 控制栏 */}
      <div className="presentation-controls">
        <div className="controls-left">
          <button onClick={prevSlide} disabled={currentSlide === 0}>
            ◀
          </button>
          <span className="slide-counter">
            {currentSlide + 1} / {totalSlides}
          </span>
          <button onClick={nextSlide} disabled={currentSlide === totalSlides - 1}>
            ▶
          </button>
        </div>

        <div className="controls-center">
          <button
            className={isPlaying ? 'active' : ''}
            onClick={() => setIsPlaying(!isPlaying)}
            title="自动播放"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className={showNotes ? 'active' : ''}
            onClick={() => setShowNotes(!showNotes)}
            title="演讲者备注 (N)"
          >
            📝
          </button>
          <button
            className={showOverview ? 'active' : ''}
            onClick={() => setShowOverview(!showOverview)}
            title="幻灯片概览 (O)"
          >
            ⊞
          </button>
        </div>

        <div className="controls-right">
          <select
            value={transition}
            onChange={(e) => setTransition(e.target.value)}
            title="转场效果"
          >
            <option value="fade">淡入淡出</option>
            <option value="slide">滑动</option>
            <option value="zoom">缩放</option>
            <option value="none">无</option>
          </select>
          <button onClick={onExit} title="退出演示">
            ✕
          </button>
        </div>
      </div>

      {/* 进度条 */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default PresentationMode;
