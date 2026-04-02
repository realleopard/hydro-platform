-- V3: 插入 5 个示例水文模型
-- admin user id: 21c3a1c2-79fa-4a0b-8669-58fc04704263

INSERT INTO models (id, name, description, category_id, owner_id, docker_image, interfaces, resources, parameters, current_version, status, visibility, run_count, download_count, rating_avg, rating_count, tags, created_at, updated_at)
VALUES
(
  gen_random_uuid(),
  'SCS-CN 降雨径流模型',
  '基于美国农业部水土保持局曲线数法(SCS-CN)的降雨径流计算模型。通过曲线数(CN)、前期土壤湿度条件计算直接径流量，广泛应用于流域水文分析和洪水预警。',
  'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  '21c3a1c2-79fa-4a0b-8669-58fc04704263',
  'watershed/scs-cn:v1.0.0',
  '[{"name":"rainfall","type":"input","dataType":"timeseries","description":"降雨量时序数据(mm)","required":true},{"name":"duration","type":"input","dataType":"scalar","description":"降雨持续时间(h)","required":false},{"name":"runoff","type":"output","dataType":"timeseries","description":"径流量时序数据(mm)"},{"name":"peak_runoff","type":"output","dataType":"scalar","description":"峰值径流量(mm)"},{"name":"total_runoff","type":"output","dataType":"scalar","description":"总径流量(mm)"}]'::jsonb,
  '{"cpu":"1","memory":"512Mi","timeout":300}'::jsonb,
  '[{"name":"cn","type":"float","default":65,"min":30,"max":100,"description":"曲线号(Curve Number)"},{"name":"ia_ratio","type":"float","default":0.2,"min":0.05,"max":0.5,"description":"初始损失比"}]'::jsonb,
  '1.0.0', 'published', 'public', 0, 0, 0.0, 0,
  ARRAY['rainfall', 'runoff', 'scs-cn', 'curve-number'],
  NOW(), NOW()
),
(
  gen_random_uuid(),
  'Muskingum 洪水演进模型',
  '基于 Muskingum 方法的河道洪水演进模型。利用连续性方程和线性蓄泄关系，通过参数 K(传播时间)和 X(权重因子)模拟洪峰在河道中的衰减和延迟过程。',
  'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  '21c3a1c2-79fa-4a0b-8669-58fc04704263',
  'watershed/muskingum:v1.0.0',
  '[{"name":"inflow","type":"input","dataType":"timeseries","description":"上游入流量时序(m³/s)","required":true},{"name":"initial_outflow","type":"input","dataType":"scalar","description":"初始出流量(m³/s)","required":false},{"name":"outflow","type":"output","dataType":"timeseries","description":"演进后出流量时序(m³/s)"},{"name":"peak_attenuation","type":"output","dataType":"scalar","description":"洪峰衰减比"},{"name":"peak_lag_time","type":"output","dataType":"scalar","description":"洪峰延迟时间(h)"}]'::jsonb,
  '{"cpu":"1","memory":"512Mi","timeout":300}'::jsonb,
  '[{"name":"K","type":"float","default":12,"min":1,"max":48,"description":"传播时间(h)"},{"name":"X","type":"float","default":0.2,"min":0,"max":0.5,"description":"权重因子"},{"name":"dt","type":"float","default":1,"min":0.1,"max":24,"description":"时间步长(h)"}]'::jsonb,
  '1.0.0', 'published', 'public', 0, 0, 0.0, 0,
  ARRAY['flood', 'routing', 'muskingum', 'channel'],
  NOW(), NOW()
),
(
  gen_random_uuid(),
  'BOD-DO 水质模型',
  '基于 Streeter-Phelps 方程的河流水质模型。模拟生化需氧量(BOD)和溶解氧(DO)沿河道的空间分布，计算临界氧亏点和最小溶解氧浓度。',
  'c2b3c4d5-e6f7-8901-bcde-f23456789012',
  '21c3a1c2-79fa-4a0b-8669-58fc04704263',
  'watershed/bod-do:v1.0.0',
  '[{"name":"distance","type":"input","dataType":"scalar","description":"计算距离数组(km)","required":false},{"name":"BOD","type":"output","dataType":"timeseries","description":"BOD浓度沿程分布(mg/L)"},{"name":"DO","type":"output","dataType":"timeseries","description":"DO浓度沿程分布(mg/L)"},{"name":"critical_distance","type":"output","dataType":"scalar","description":"临界距离(km)"},{"name":"minimum_DO","type":"output","dataType":"scalar","description":"最小溶解氧(mg/L)"}]'::jsonb,
  '{"cpu":"1","memory":"512Mi","timeout":300}'::jsonb,
  '[{"name":"kd","type":"float","default":0.2,"min":0.1,"max":0.5,"description":"BOD降解系数(1/d)"},{"name":"ka","type":"float","default":0.5,"min":0.2,"max":2.0,"description":"复氧系数(1/d)"},{"name":"L0","type":"float","default":15,"min":1,"max":50,"description":"初始BOD浓度(mg/L)"},{"name":"DO_sat","type":"float","default":9.0,"min":6,"max":14,"description":"饱和溶解氧(mg/L)"}]'::jsonb,
  '1.0.0', 'published', 'public', 0, 0, 0.0, 0,
  ARRAY['water-quality', 'BOD', 'DO', 'streeter-phelps'],
  NOW(), NOW()
),
(
  gen_random_uuid(),
  'Penman-Monteith 蒸散发模型',
  '基于 FAO-56 Penman-Monteith 方程的参考作物蒸散发(ET0)计算模型。联合国粮农组织推荐的标准方法，综合温度、湿度、风速和辐射数据计算蒸散发量。',
  'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  '21c3a1c2-79fa-4a0b-8669-58fc04704263',
  'watershed/penman-monteith:v1.0.0',
  '[{"name":"temperature","type":"input","dataType":"timeseries","description":"气温时序(°C)","required":true},{"name":"humidity","type":"input","dataType":"timeseries","description":"相对湿度时序(%)","required":true},{"name":"wind_speed","type":"input","dataType":"timeseries","description":"风速时序(m/s)","required":true},{"name":"solar_radiation","type":"input","dataType":"timeseries","description":"太阳辐射时序(MJ/m²/d)","required":true},{"name":"ET0","type":"output","dataType":"timeseries","description":"参考蒸散发量(mm/d)"},{"name":"net_radiation","type":"output","dataType":"timeseries","description":"净辐射(MJ/m²/d)"},{"name":"soil_heat_flux","type":"output","dataType":"timeseries","description":"土壤热通量(MJ/m²/d)"}]'::jsonb,
  '{"cpu":"1","memory":"512Mi","timeout":600}'::jsonb,
  '[{"name":"altitude","type":"float","default":100,"min":0,"max":5000,"description":"海拔高度(m)"},{"name":"latitude","type":"float","default":30,"min":-90,"max":90,"description":"纬度(°)"},{"name":"albedo","type":"float","default":0.23,"min":0.1,"max":0.5,"description":"地表反照率"}]'::jsonb,
  '1.0.0', 'published', 'public', 0, 0, 0.0, 0,
  ARRAY['evapotranspiration', 'penman-monteith', 'ET0', 'FAO-56'],
  NOW(), NOW()
),
(
  gen_random_uuid(),
  '水文频率分析模型',
  '基于皮尔逊III型(P-III)、耿贝尔(Gumbel)和广义极值(GEV)分布的水文频率分析模型。用于计算给定重现期的设计洪水或设计暴雨值。',
  'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  '21c3a1c2-79fa-4a0b-8669-58fc04704263',
  'watershed/frequency-analysis:v1.0.0',
  '[{"name":"annual_maxima","type":"input","dataType":"timeseries","description":"年最大值序列(mm或m³/s)","required":true},{"name":"design_values","type":"output","dataType":"scalar","description":"各重现期设计值(JSON)"},{"name":"distribution_params","type":"output","dataType":"scalar","description":"分布参数(JSON)"},{"name":"goodness_of_fit","type":"output","dataType":"scalar","description":"拟合优度统计量(JSON)"}]'::jsonb,
  '{"cpu":"1","memory":"1Gi","timeout":600}'::jsonb,
  '[{"name":"distribution","type":"string","default":"pearson3","description":"分布类型(pearson3/gumbel/gev)"},{"name":"return_periods","type":"string","default":"[10,20,50,100]","description":"重现期列表"},{"name":"confidence_level","type":"float","default":0.95,"min":0.9,"max":0.99,"description":"置信水平"}]'::jsonb,
  '1.0.0', 'published', 'public', 0, 0, 0.0, 0,
  ARRAY['frequency', 'statistics', 'pearson3', 'gumbel', 'GEV'],
  NOW(), NOW()
);
