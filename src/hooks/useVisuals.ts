import { useAuth } from '@/contexts/AuthContext';
import { ChartType, PLAN_LIMITS, AddonType } from '@/types';

export function useVisuals() {
  const { user } = useAuth();
  
  const plan = user?.plan ?? 'free';
  const addons = user?.addons ?? [];

  const isChartAvailable = (chartType: ChartType): boolean => {
    const planCharts = PLAN_LIMITS[plan].charts;
    
    // Check if chart is in plan
    if (planCharts.includes(chartType)) return true;
    
    // Check if chart is available via addon
    if (chartType === 'geo' && addons.includes('geo-maps')) return true;
    
    return false;
  };

  const getAvailableCharts = (): ChartType[] => {
    const planCharts = [...PLAN_LIMITS[plan].charts];
    
    if (addons.includes('geo-maps') && !planCharts.includes('geo')) {
      planCharts.push('geo');
    }
    
    return planCharts;
  };

  const getAllCharts = (): ChartType[] => {
    return ['bar', 'line', 'area', 'scatter', 'pie', 'heatmap', 'boxplot', 'radar', 'treemap', 'geo'];
  };

  const getLockedCharts = (): ChartType[] => {
    const available = getAvailableCharts();
    return getAllCharts().filter(c => !available.includes(c));
  };

  const getRequiredPlanForChart = (chartType: ChartType): string => {
    if (PLAN_LIMITS.free.charts.includes(chartType)) return 'Free';
    if (PLAN_LIMITS.pro.charts.includes(chartType)) return 'Pro';
    if (chartType === 'geo') return 'Enterprise or Geo Maps Addon';
    return 'Enterprise';
  };

  const isFeatureAvailable = (feature: string): boolean => {
    return PLAN_LIMITS[plan].features.includes(feature);
  };

  const hasAddon = (addon: AddonType): boolean => {
    return addons.includes(addon);
  };

  return {
    plan,
    addons,
    isChartAvailable,
    getAvailableCharts,
    getAllCharts,
    getLockedCharts,
    getRequiredPlanForChart,
    isFeatureAvailable,
    hasAddon,
  };
}
