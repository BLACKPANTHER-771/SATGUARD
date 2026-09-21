import React from 'react';
import {
  LayoutDashboard,
  Globe2,
  Satellite,
  Mountain,
  BarChart3,
  CloudRain,
  History,
  RotateCcw,
  Route,
  Zap,
  Database,
  GitMerge,
  Smartphone,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { ViewType } from '../../types';

interface NavigationProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
}

interface NavGroup {
  name: string;
  items: {
    id: ViewType;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[];
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onSelectView }) => {
  const groups: NavGroup[] = [
    {
      name: 'OVERVIEW',
      items: [
        { id: 'command_center', label: 'Command Center', icon: LayoutDashboard },
        { id: 'satellite_view', label: 'Satellite Dashboard', icon: Satellite }
      ]
    },
    {
      name: 'ASSESSMENT',
      items: [
        { id: 'damage_assessment', label: 'Damage Engine', icon: ShieldAlert },
        { id: 'change_detection', label: 'Change Detection', icon: Layers }
      ]
    },
    {
      name: 'EARTH',
      items: [
        { id: 'map_3d', label: '3D Earth', icon: Globe2 },
        { id: 'satellite_view', label: 'Satellite', icon: Satellite },
        { id: 'soil_moisture', label: 'Terrain / Soil', icon: Mountain }
      ]
    },
    {
      name: 'INTELLIGENCE',
      items: [
        { id: 'risk_intelligence', label: 'Risk Matrix', icon: BarChart3 },
        { id: 'forecast', label: 'Forecast', icon: CloudRain },
        { id: 'historical_view', label: 'History', icon: History }
      ]
    },
    {
      name: 'FIELD',
      items: [
        { id: 'field_mode', label: 'Field App (PWA)', icon: Smartphone },
        { id: 'truth_loop', label: 'Field Reports', icon: RotateCcw },
        { id: 'infrastructure', label: 'Roads', icon: Route },
        { id: 'response_sop', label: 'Response', icon: Zap }
      ]
    },
    {
      name: 'SYSTEM',
      items: [
        { id: 'alert_center', label: 'Alerts', icon: Zap },
        { id: 'data_sources', label: 'Data Sources', icon: Database },
        { id: 'pipeline_view', label: 'Pipeline', icon: GitMerge }
      ]
    }
  ];

  return (
    <nav className="bg-[#F7F4EB] border-b border-[#D7DEDC] shadow-[0_2px_8px_rgba(23,33,38,0.06)] px-5 py-1.5 flex items-center space-x-7 overflow-x-auto text-xs font-sans select-none scrollbar-none z-20">
      {groups.map((grp, gIdx) => (
        <div key={grp.name} className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[10px] uppercase font-semibold text-[#667579]/80 tracking-wider mr-1 select-none">
            {grp.name}
          </span>
          <div className="flex items-center space-x-1">
            {grp.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all duration-200 text-xs relative cursor-pointer ${
                    isActive
                      ? 'text-[#167F78] font-semibold bg-[#167F78]/10 border border-[#167F78]/20'
                      : 'text-[#667579] hover:text-[#172126] hover:bg-[#FAF8F1] font-normal border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 transition-colors duration-200 ${isActive ? 'text-[#167F78]' : 'text-[#667579]'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#167F78] rounded-full transition-all duration-200" />
                  )}
                </button>
              );
            })}
          </div>
          {gIdx < groups.length - 1 && (
            <span className="text-[#D7DEDC] ml-4 select-none">|</span>
          )}
        </div>
      ))}
    </nav>
  );
};




