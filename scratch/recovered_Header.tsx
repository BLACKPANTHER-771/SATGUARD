
  return (
    <header className="bg-[#FAF8F1] border-b border-[#D7DEDC] select-none sticky top-0 z-30 font-sans shadow-subtle">
      {/* 1. PRIMARY TOP HEADER */}
      <div className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-4 border-b border-[#D7DEDC]/70">
        {/* LEFT: Epoch cursive wordmark (44px) + Subtitle */}
        <div className="flex items-center space-x-3">
          <div className="flex items-baseline space-x-2.5">
            <span className="font-brand text-[44px] text-[#172126] font-normal italic tracking-normal select-none leading-none">
              Epoch
            </span>
            <span className="text-[11px] text-[#667579] font-medium tracking-tight">
              SIH26001 · North East India
            </span>
          </div>
        </div>

        {/* CENTER: Current Operational Region */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          <span className="text-[#667579] uppercase tracking-wider text-[11px] font-medium">Region:</span>
          <span className="text-[#172126] font-semibold text-sm">
            {selectedState === 'Assam' ? 'Assam — Dima Hasao' : 'Sikkim — Mangan District'}
          </span>
          <span className="text-[#D7DEDC] mx-1">•</span>
          <span className="text-[#167F78] font-medium text-xs">
            {selectedState === 'Assam' ? 'Haflong Ghat Sector' : 'Chungthang Basin (Teesta-III Dam Corridor)'}
