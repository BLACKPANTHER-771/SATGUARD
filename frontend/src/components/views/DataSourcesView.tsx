import React from 'react';
import {
  Database,
  CheckCircle2,
  CloudRain,
  Droplets,
  Satellite,
  Mountain,
  History
} from 'lucide-react';
import { PSDataSource } from '../../types';

interface DataSourcesViewProps {
  dataSources: PSDataSource[];
}

export const DataSourcesView: React.FC<DataSourcesViewProps> = ({ dataSources }) => {
  const categoryIcons: Record<string, any> = {
    'Rainfall': CloudRain,
    'Soil Moisture': Droplets,
    'Satellite Observation': Satellite,
    'Terrain / Slope': Mountain,
    'Historical Landslide Records': History
  };

  return (
    <div className="h-full flex flex-col space-y-3 font-sans select-none overflow-y-auto pr-1">
      {/* Header */}
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-subtle card-hover-lift">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-[#167F78]" />
            <h1 className="font-semibold text-sm text-[#172126] tracking-wide">
              5 CORE GEOSPATIAL DATA SOURCES & SCIENTIFIC PROVENANCE
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#167F78]/10 text-[#167F78] border border-[#167F78]/25 font-semibold">
              PS REQUIRED MODULES
            </span>
          </div>
          <p className="text-xs text-[#667579] mt-1">
            Data pipeline health, spatial resolution, and readiness for external integration (IMD AWSR, GSI NLSM, ISRO/Bhuvan, Copernicus Sentinel).
          </p>
        </div>
      </div>

      {/* 5 Required Data Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dataSources.map((ds, idx) => {
          const Icon = categoryIcons[ds.category] || Database;
          const isGov = ds.provenance.includes('GOVERNMENT');
          const isDerived = ds.provenance === 'DERIVED';

          return (
            <div
              key={idx}
              className="bg-[#FAF8F1] border border-[#D7DEDC] hover:border-[#CBD5D2] rounded-xl p-3.5 space-y-3 shadow-subtle transition-all card-hover-lift flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#D7DEDC] pb-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#E6EDEB] border border-[#D7DEDC] flex items-center justify-center text-[#167F78]">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#172126] block">{ds.category}</span>
                      <span className="text-[10px] font-mono text-[#667579]">{ds.spatial_resolution}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                      isGov
                        ? 'bg-[#167F78]/15 text-[#167F78] border-[#167F78]/30'
                        : isDerived
                        ? 'bg-[#397FA8]/15 text-[#397FA8] border-[#397FA8]/30'
                        : 'bg-[#C58A24]/15 text-[#C58A24] border-[#C58A24]/30'
                    }`}
                  >
                    [{ds.provenance}]
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 mt-2.5 text-xs">
                  <div className="text-xs font-semibold text-[#172126]">{ds.source_name}</div>
                  <div className="text-[11px] text-[#667579]">{ds.data_type}</div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-mono">
                    <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC]">
                      <span className="text-[#667579] text-[10px] block">STATUS:</span>
                      <span className="text-[#167F78] font-semibold">{ds.status}</span>
                    </div>
                    <div className="bg-[#E6EDEB] p-2 rounded-lg border border-[#D7DEDC]">
                      <span className="text-[#667579] text-[10px] block">CONFIDENCE:</span>
                      <span className="text-[#172126] font-semibold">{ds.confidence}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ready For Integration Footer */}
              <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC] text-[11px] mt-2.5">
                <span className="text-[#667579] block text-[10px] uppercase font-semibold">API ADAPTER:</span>
                <span className="text-[#167F78] font-medium flex items-center mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                  {ds.ready_for}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};




