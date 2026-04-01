// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Mock window.matchMedia
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

// Mock IntersectionObserver
class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = IntersectionObserver;

// Mock ResizeObserver
class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// Mock Cesium
jest.mock('cesium', () => ({
  Viewer: jest.fn(),
  Cartesian3: {
    fromDegrees: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    fromDegreesArray: jest.fn(() => []),
    subtract: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    cross: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    magnitude: jest.fn(() => 0),
    add: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    divideByScalar: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    ZERO: { x: 0, y: 0, z: 0 }
  },
  Color: {
    fromCssColorString: jest.fn(() => ({ withAlpha: jest.fn() })),
    WHITE: {},
    BLACK: {},
    YELLOW: {},
    RED: {},
    GREEN: {}
  },
  HeightReference: {
    CLAMP_TO_GROUND: 'CLAMP_TO_GROUND'
  },
  ScreenSpaceEventHandler: jest.fn(() => ({
    setInputAction: jest.fn(),
    destroy: jest.fn()
  })),
  ScreenSpaceEventType: {
    LEFT_CLICK: 'LEFT_CLICK',
    RIGHT_CLICK: 'RIGHT_CLICK'
  },
  Math: {
    toRadians: jest.fn((deg) => deg * Math.PI / 180)
  },
  JulianDate: {
    fromDate: jest.fn()
  },
  Rectangle: {
    fromDegrees: jest.fn()
  },
  PolygonHierarchy: jest.fn(),
  Transforms: {
    eastNorthUpToFixedFrame: jest.fn()
  },
  Cartographic: {
    fromCartesian: jest.fn(() => ({ longitude: 0, latitude: 0, height: 0 }))
  },
  PolylineArrowMaterialProperty: jest.fn()
}));
