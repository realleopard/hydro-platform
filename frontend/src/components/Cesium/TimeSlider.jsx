import React, { useState, useCallback, useEffect } from 'react';
import * as Cesium from 'cesium';
import './TimeSlider.css';

/**
 * 时间轴控制组件 - 用于控制模拟时间进度和动画
 */
const TimeSlider = ({ viewer, startTime, endTime, currentTime, onTimeChange, onPlayStateChange }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loopPlayback, setLoopPlayback] = useState(false);

  // 格式化时间显示
  const formatTime = useCallback((time) => {
    if (!time) return '--:--';
    const date = new Date(time);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // 计算进度百分比
  const calculateProgress = useCallback(() => {
    if (!startTime || !endTime || !currentTime) return 0;
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const current = new Date(currentTime).getTime();
    return ((current - start) / (end - start)) * 100;
  }, [startTime, endTime, currentTime]);

  // 处理滑块变化
  const handleSliderChange = useCallback((e) => {
    const progress = parseFloat(e.target.value);
    if (startTime && endTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      const newTime = new Date(start + (progress / 100) * (end - start));
      onTimeChange?.(newTime);
    }
  }, [startTime, endTime, onTimeChange]);

  // 播放/暂停
  const togglePlay = useCallback(() => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    onPlayStateChange?.(newState);
  }, [isPlaying, onPlayStateChange]);

  // 步进控制
  const stepBackward = useCallback(() => {
    if (startTime && endTime && currentTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      const current = new Date(currentTime).getTime();
      const stepSize = (end - start) / 100; // 1% 步进
      const newTime = new Date(Math.max(start, current - stepSize));
      onTimeChange?.(newTime);
    }
  }, [startTime, endTime, currentTime, onTimeChange]);

  const stepForward = useCallback(() => {
    if (startTime && endTime && currentTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      const current = new Date(currentTime).getTime();
      const stepSize = (end - start) / 100; // 1% 步进
      const newTime = new Date(Math.min(end, current + stepSize));
      onTimeChange?.(newTime);
    }
  }, [startTime, endTime, currentTime, onTimeChange]);

  // 跳转到开始/结束
  const jumpToStart = useCallback(() => {
    if (startTime) {
      onTimeChange?.(new Date(startTime));
    }
  }, [startTime, onTimeChange]);

  const jumpToEnd = useCallback(() => {
    if (endTime) {
      onTimeChange?.(new Date(endTime));
    }
  }, [endTime, onTimeChange]);

  // 自动播放效果
  useEffect(() => {
    if (!isPlaying || !startTime || !endTime) return;

    const interval = setInterval(() => {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      const current = new Date(currentTime).getTime();
      const stepSize = (end - start) / 1000 * playbackSpeed;

      let newTime = current + stepSize;
      if (newTime > end) {
        if (loopPlayback) {
          newTime = start;
        } else {
          newTime = end;
          setIsPlaying(false);
          onPlayStateChange?.(false);
        }
      }
      onTimeChange?.(new Date(newTime));
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, startTime, endTime, currentTime, playbackSpeed, loopPlayback, onTimeChange, onPlayStateChange]);

  // 同步 Cesium 时间
  useEffect(() => {
    if (!viewer || !currentTime) return;
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(currentTime));
  }, [viewer, currentTime]);

  if (!startTime || !endTime) return null;

  const progress = calculateProgress();

  return (
    <div className="time-slider-container">
      <div className="time-slider-header">
        <span className="time-display">{formatTime(currentTime)}</span>
        <span className="time-range">
          {formatTime(startTime)} - {formatTime(endTime)}
        </span>
      </div>

      <div className="time-slider-main">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSliderChange}
          className="time-slider"
        />
        <div className="time-progress" style={{ width: `${progress}%` }} />
      </div>

      <div className="time-slider-controls">
        <div className="control-group">
          <button className="time-btn" onClick={jumpToStart} title="跳转到开始">
            ⏮
          </button>
          <button className="time-btn" onClick={stepBackward} title="后退">
            ⏴
          </button>
          <button className="time-btn play-btn" onClick={togglePlay} title={isPlaying ? "暂停" : "播放"}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="time-btn" onClick={stepForward} title="前进">
            ⏵
          </button>
          <button className="time-btn" onClick={jumpToEnd} title="跳转到结束">
            ⏭
          </button>
        </div>

        <div className="control-group">
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="speed-select"
            title="播放速度"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>

          <label className="loop-checkbox" title="循环播放">
            <input
              type="checkbox"
              checked={loopPlayback}
              onChange={(e) => setLoopPlayback(e.target.checked)}
            />
            <span>🔁</span>
          </label>
        </div>
      </div>

      <div className="time-slider-markers">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
};

export default TimeSlider;
