import React, { useState, useCallback, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, Cell
} from 'recharts';
import './SensitivityAnalysis.css';

/**
 * 参数敏感性分析组件
 * 支持单参数扫描、多参数组合、Sobol敏感性分析
 */
const SensitivityAnalysis = ({ modelId, onRunAnalysis }) => {
  const [analysisType, setAnalysisType] = useState('single'); // single, multi, sobol
  const [parameters, setParameters] = useState([]);
  const [selectedParam, setSelectedParam] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    sampleSize: 100,
    method: 'lhs', // latin hypercube sampling
    outputVariable: '',
    perturbationRange: 0.2 // ±20%
  });

  // 添加参数
  const addParameter = useCallback(() => {
    setParameters(prev => [...prev, {
      id: Date.now(),
      name: '',
      baseline: 0,
      min: 0,
      max: 1,
      distribution: 'uniform'
    }]);
  }, []);

  // 更新参数
  const updateParameter = useCallback((id, field, value) => {
    setParameters(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  }, []);

  // 删除参数
  const removeParameter = useCallback((id) => {
    setParameters(prev => prev.filter(p => p.id !== id));
  }, []);

  // 运行分析
  const runAnalysis = useCallback(async () => {
    if (parameters.length === 0) {
      alert('请至少添加一个参数');
      return;
    }

    setLoading(true);
    try {
      const analysisConfig = {
        modelId,
        type: analysisType,
        parameters,
        config
      };

      const response = await onRunAnalysis?.(analysisConfig);
      setResults(response);
    } catch (error) {
      console.error('分析失败:', error);
      alert('分析运行失败');
    } finally {
      setLoading(false);
    }
  }, [modelId, analysisType, parameters, config, onRunAnalysis]);

  // 计算敏感性指标
  const calculateSensitivityMetrics = useCallback((data) => {
    if (!data || !data.samples) return [];

    return parameters.map(param => {
      const paramSamples = data.samples.map(s => s[param.name]);
      const outputSamples = data.samples.map(s => s[config.outputVariable]);

      // 计算Pearson相关系数
      const correlation = calculatePearsonCorrelation(paramSamples, outputSamples);

      // 计算标准化回归系数
      const src = calculateStandardizedRegression(paramSamples, outputSamples);

      return {
        parameter: param.name,
        correlation: Math.abs(correlation),
        src: Math.abs(src),
        rank: 0 // 将在排序后更新
      };
    }).sort((a, b) => b.src - a.src)
      .map((m, i) => ({ ...m, rank: i + 1 }));
  }, [parameters, config.outputVariable]);

  // 生成龙卷风图数据
  const generateTornadoData = useCallback(() => {
    if (!results) return [];

    const metrics = calculateSensitivityMetrics(results);
    return metrics.map(m => ({
      name: m.parameter,
      value: m.src,
      correlation: m.correlation
    }));
  }, [results, calculateSensitivityMetrics]);

  // 生成散点图数据
  const generateScatterData = useCallback(() => {
    if (!results || !selectedParam) return [];

    return results.samples.map(s => ({
      x: s[selectedParam],
      y: s[config.outputVariable]
    }));
  }, [results, selectedParam, config.outputVariable]);

  return (
    <div className="sensitivity-analysis">
      <div className="analysis-header">
        <h2>参数敏感性分析</h2>
        <div className="analysis-type-selector">
          <button
            className={analysisType === 'single' ? 'active' : ''}
            onClick={() => setAnalysisType('single')}
          >
            单参数扫描
          </button>
          <button
            className={analysisType === 'multi' ? 'active' : ''}
            onClick={() => setAnalysisType('multi')}
          >
            多参数组合
          </button>
          <button
            className={analysisType === 'sobol' ? 'active' : ''}
            onClick={() => setAnalysisType('sobol')}
          >
            Sobol分析
          </button>
        </div>
      </div>

      <div className="analysis-content">
        <div className="config-panel">
          <div className="config-section">
            <h3>分析配置</h3>
            <div className="config-row">
              <label>采样方法:</label>
              <select
                value={config.method}
                onChange={(e) => setConfig({ ...config, method: e.target.value })}
              >
                <option value="lhs">拉丁超立方采样 (LHS)</option>
                <option value="monte_carlo">蒙特卡洛</option>
                <option value="grid">网格搜索</option>
              </select>
            </div>
            <div className="config-row">
              <label>样本数量:</label>
              <input
                type="number"
                value={config.sampleSize}
                onChange={(e) => setConfig({ ...config, sampleSize: parseInt(e.target.value) })}
                min={10}
                max={10000}
              />
            </div>
            <div className="config-row">
              <label>扰动范围:</label>
              <input
                type="range"
                value={config.perturbationRange * 100}
                onChange={(e) => setConfig({ ...config, perturbationRange: parseInt(e.target.value) / 100 })}
                min={5}
                max={50}
              />
              <span>±{config.perturbationRange * 100}%</span>
            </div>
            <div className="config-row">
              <label>输出变量:</label>
              <input
                type="text"
                value={config.outputVariable}
                onChange={(e) => setConfig({ ...config, outputVariable: e.target.value })}
                placeholder="如: runoff, nse"
              />
            </div>
          </div>

          <div className="config-section">
            <div className="section-header">
              <h3>参数列表</h3>
              <button className="add-btn" onClick={addParameter}>+ 添加参数</button>
            </div>
            <div className="parameter-list">
              {parameters.map((param, index) => (
                <div key={param.id} className="parameter-item">
                  <div className="param-header">
                    <span className="param-index">#{index + 1}</span>
                    <button
                      className="remove-btn"
                      onClick={() => removeParameter(param.id)}
                    >
                      ×
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="参数名称"
                    value={param.name}
                    onChange={(e) => updateParameter(param.id, 'name', e.target.value)}
                  />
                  <div className="param-range">
                    <input
                      type="number"
                      placeholder="基线值"
                      value={param.baseline}
                      onChange={(e) => updateParameter(param.id, 'baseline', parseFloat(e.target.value))}
                    />
                    <input
                      type="number"
                      placeholder="最小值"
                      value={param.min}
                      onChange={(e) => updateParameter(param.id, 'min', parseFloat(e.target.value))}
                    />
                    <input
                      type="number"
                      placeholder="最大值"
                      value={param.max}
                      onChange={(e) => updateParameter(param.id, 'max', parseFloat(e.target.value))}
                    />
                  </div>
                  <select
                    value={param.distribution}
                    onChange={(e) => updateParameter(param.id, 'distribution', e.target.value)}
                  >
                    <option value="uniform">均匀分布</option>
                    <option value="normal">正态分布</option>
                    <option value="lognormal">对数正态</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <button
            className="run-analysis-btn"
            onClick={runAnalysis}
            disabled={loading || parameters.length === 0}
          >
            {loading ? '运行中...' : '运行分析'}
          </button>
        </div>

        <div className="results-panel">
          {results ? (
            <>
              <div className="results-tabs">
                <button
                  className={!selectedParam ? 'active' : ''}
                  onClick={() => setSelectedParam(null)}
                >
                  龙卷风图
                </button>
                {parameters.map(p => (
                  <button
                    key={p.id}
                    className={selectedParam === p.name ? 'active' : ''}
                    onClick={() => setSelectedParam(p.name)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="chart-container">
                {!selectedParam ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={generateTornadoData()}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#1890ff" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={selectedParam}
                        label={{ value: selectedParam, position: 'bottom' }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={config.outputVariable}
                        label={{ value: config.outputVariable, angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter
                        name={`${selectedParam} vs ${config.outputVariable}`}
                        data={generateScatterData()}
                        fill="#1890ff"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="metrics-table">
                <h4>敏感性指标</h4>
                <table>
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>参数</th>
                      <th>相关系数</th>
                      <th>SRC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateSensitivityMetrics(results).map(m => (
                      <tr key={m.parameter}>
                        <td>{m.rank}</td>
                        <td>{m.parameter}</td>
                        <td>{m.correlation.toFixed(4)}</td>
                        <td>{m.src.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="empty-results">
              <p>配置参数并运行分析以查看结果</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 计算Pearson相关系数
function calculatePearsonCorrelation(x, y) {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

// 计算标准化回归系数
function calculateStandardizedRegression(x, y) {
  const meanX = x.reduce((a, b) => a + b, 0) / x.length;
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;

  const stdX = Math.sqrt(x.reduce((total, xi) => total + Math.pow(xi - meanX, 2), 0) / x.length);
  const stdY = Math.sqrt(y.reduce((total, yi) => total + Math.pow(yi - meanY, 2), 0) / y.length);

  const correlation = calculatePearsonCorrelation(x, y);

  return stdX === 0 ? 0 : correlation * stdY / stdX;
}

export default SensitivityAnalysis;
