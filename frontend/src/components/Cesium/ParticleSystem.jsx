import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';

/**
 * 粒子系统组件 - 用于渲染降雨、径流等水文特效
 */
const ParticleSystem = ({ viewer, type, data, options = {} }) => {
  const particleSystemsRef = useRef([]);

  const createRainfallParticles = useCallback((positions, intensity = 1.0) => {
    if (!viewer || !positions.length) return;

    const systems = positions.map(pos => {
      const { longitude, latitude, height = 5000 } = pos;

      return viewer.scene.primitives.add(new Cesium.ParticleSystem({
        image: '/textures/rain-drop.png',
        startColor: new Cesium.Color(0.8, 0.9, 1.0, 0.6 * intensity),
        endColor: new Cesium.Color(0.8, 0.9, 1.0, 0.0),
        startScale: 1.0,
        endScale: 0.5,
        minimumParticleLife: 0.5,
        maximumParticleLife: 1.0,
        minimumSpeed: 50,
        maximumSpeed: 100,
        imageSize: new Cesium.Cartesian2(4, 20),
        emissionRate: 100 * intensity,
        lifetime: 16.0,
        emitter: new Cesium.CircleEmitter(5000),
        emitterModelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
          Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
        ),
        updateCallback: (particle, dt) => {
          particle.velocity = new Cesium.Cartesian3(0, 0, -particle.speed);
        }
      }));
    });

    particleSystemsRef.current.push(...systems);
  }, [viewer]);

  const createRunoffParticles = useCallback((path, flowRate = 1.0) => {
    if (!viewer || !path.length) return;

    // 创建沿路径的粒子系统
    const systems = [];
    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i];
      const end = path[i + 1];
      const midLon = (start.longitude + end.longitude) / 2;
      const midLat = (start.latitude + end.latitude) / 2;
      const midHeight = ((start.height || 0) + (end.height || 0)) / 2;

      const system = viewer.scene.primitives.add(new Cesium.ParticleSystem({
        image: '/textures/water-particle.png',
        startColor: new Cesium.Color(0.0, 0.6, 1.0, 0.8 * flowRate),
        endColor: new Cesium.Color(0.0, 0.4, 0.8, 0.0),
        startScale: 0.5,
        endScale: 0.2,
        minimumParticleLife: 1.0,
        maximumParticleLife: 3.0,
        minimumSpeed: 5,
        maximumSpeed: 15,
        imageSize: new Cesium.Cartesian2(8, 8),
        emissionRate: 50 * flowRate,
        lifetime: 10.0,
        emitter: new Cesium.CircleEmitter(100),
        emitterModelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
          Cesium.Cartesian3.fromDegrees(midLon, midLat, midHeight)
        )
      }));

      systems.push(system);
    }

    particleSystemsRef.current.push(...systems);
  }, [viewer]);

  const createSnowfallParticles = useCallback((positions, intensity = 1.0) => {
    if (!viewer || !positions.length) return;

    const systems = positions.map(pos => {
      const { longitude, latitude, height = 3000 } = pos;

      return viewer.scene.primitives.add(new Cesium.ParticleSystem({
        image: '/textures/snow-flake.png',
        startColor: new Cesium.Color(1.0, 1.0, 1.0, 0.8 * intensity),
        endColor: new Cesium.Color(1.0, 1.0, 1.0, 0.0),
        startScale: 0.5,
        endScale: 0.2,
        minimumParticleLife: 2.0,
        maximumParticleLife: 5.0,
        minimumSpeed: 2,
        maximumSpeed: 8,
        imageSize: new Cesium.Cartesian2(6, 6),
        emissionRate: 80 * intensity,
        lifetime: 20.0,
        emitter: new Cesium.CircleEmitter(3000),
        emitterModelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
          Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
        ),
        updateCallback: (particle, dt) => {
          // 添加飘动效果
          const time = Date.now() / 1000;
          particle.velocity.x += Math.sin(time + particle.age) * 0.5;
          particle.velocity.y += Math.cos(time + particle.age) * 0.5;
        }
      }));
    });

    particleSystemsRef.current.push(...systems);
  }, [viewer]);

  const createEvaporationParticles = useCallback((positions, rate = 1.0) => {
    if (!viewer || !positions.length) return;

    const systems = positions.map(pos => {
      const { longitude, latitude, height = 0 } = pos;

      return viewer.scene.primitives.add(new Cesium.ParticleSystem({
        image: '/textures/vapor.png',
        startColor: new Cesium.Color(1.0, 1.0, 1.0, 0.3 * rate),
        endColor: new Cesium.Color(1.0, 1.0, 1.0, 0.0),
        startScale: 1.0,
        endScale: 3.0,
        minimumParticleLife: 3.0,
        maximumParticleLife: 6.0,
        minimumSpeed: 3,
        maximumSpeed: 8,
        imageSize: new Cesium.Cartesian2(20, 20),
        emissionRate: 30 * rate,
        lifetime: 15.0,
        emitter: new Cesium.CircleEmitter(2000),
        emitterModelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
          Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
        )
      }));
    });

    particleSystemsRef.current.push(...systems);
  }, [viewer]);

  const clearParticles = useCallback(() => {
    particleSystemsRef.current.forEach(system => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(system);
      }
    });
    particleSystemsRef.current = [];
  }, [viewer]);

  useEffect(() => {
    if (!viewer || !data) return;

    // 清除现有粒子
    clearParticles();

    // 根据类型创建相应的粒子系统
    switch (type) {
      case 'rainfall':
        createRainfallParticles(data, options.intensity);
        break;
      case 'runoff':
        createRunoffParticles(data, options.flowRate);
        break;
      case 'snowfall':
        createSnowfallParticles(data, options.intensity);
        break;
      case 'evaporation':
        createEvaporationParticles(data, options.rate);
        break;
      default:
        break;
    }

    return () => {
      clearParticles();
    };
  }, [viewer, type, data, options, createRainfallParticles, createRunoffParticles,
      createSnowfallParticles, createEvaporationParticles, clearParticles]);

  return null;
};

export default ParticleSystem;
