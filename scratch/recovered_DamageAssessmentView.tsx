          <div className="flex items-center justify-between text-[11px] text-[#667579]">
            <span className="font-bold text-[#D9822B] uppercase flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9822B] mr-1" />
              2. MAJOR DAMAGE
            </span>
            <span className="font-bold text-[#D9822B]">{stats.majorDamagePercentage}%</span>
          </div>
          <div className="text-xl font-bold text-[#D9822B]">{stats.majorDamageCount} <span className="text-[10px] font-normal text-[#667579]">structures</span></div>
          <p className="text-[9px] text-[#667579]">Substantial loss (40-65%)</p>
        </div>

        {/* Tier 3: MINOR DAMAGE */}
        <div className="bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-2 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between text-[11px] text-[#667579]">
            <span className="font-bold text-[#C5A52A] uppercase flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A52A] mr-1" />
              3. MINOR DAMAGE
            </span>
            <span className="font-bold text-[#C5A52A]">{stats.minorDamagePercentage}%</span>
          </div>
          <div className="text-xl font-bold text-[#C5A52A]">{stats.minorDamageCount} <span className="text-[10px] font-normal text-[#667579]">structures</span></div>
          <p className="text-[9px] text-[#667579]">Localized displacement (18-40%)</p>
        </div>

        {/* Tier 4: NO DAMAGE */}
        <div className="bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-2 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between text-[11px] text-[#667579]">
            <span className="font-bold text-[#4F9D69] uppercase flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F9D69] mr-1" />
              4. NO DAMAGE
            </span>
            <span className="font-bold text-[#4F9D69]">{stats.noDamagePercentage}%</span>
          </div>
          <div className="text-xl font-bold text-[#4F9D69]">{stats.noDamageCount} <span className="text-[10px] font-normal text-[#667579]">structures</span></div>
          <p className="text-[9px] text-[#667579]">Structure intact &lt;18% change</p>
        </div>
      </div>

      {/* 3. Bitemporal Workstation (Dual Canvas Split Comparison with Real Satellite Images) */}
      <BeforeAfterSatelliteWorkstation
        beforeImage={activeScene.imagePathPre}
        afterImage={activeScene.imagePathPost}
        changeMaskBase64={assessmentResult.changeDetection.changeMaskBase64}
        structures={assessmentResult.structures}
        selectedStructure={selectedStructure}
        onSelectStructure={setSelectedStructure}
        sceneTitle={activeScene.title}
        acquisitionDates={{ before: activeScene.datePre, after: activeScene.datePost }}
      />

      {/* 4. Main Two-Column Analysis Grid: Structure Table + Structure Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left Column: Structure Inventory Table (7 cols) */}
        <div className="lg:col-span-7 bg-[#FAF8F1] border border-[#C9CEC8] rounded-md p-3 space-y-2.5 shadow-sm flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7DEDC] pb-2">
            <div className="flex items-center space-x-2">
              <h3 className="font-mono font-bold text-xs text-[#172126] uppercase">
                STRUCTURE INVENTORY REGISTER ({filteredStructures.length} / {stats.totalStructures})
              </h3>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center space-x-2 text-xs">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-2 py-1 text-xs text-[#172126] font-medium cursor-pointer"
              >
                <option value="ALL">All Severities</option>
                <option value="DESTROYED">Destroyed</option>
                <option value="MAJOR_DAMAGE">Major Damage</option>
                <option value="MINOR_DAMAGE">Minor Damage</option>
                <option value="NO_DAMAGE">No Damage</option>
              </select>

              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-2 py-1 text-xs text-[#172126] font-medium cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="UNVERIFIED">Unverified</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#667579] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search structure by ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#172126] placeholder-[#667579] focus:outline-none"
            />
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-x-auto max-h-[380px] pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D7DEDC] text-[10px] font-mono text-[#667579] uppercase bg-[#E6EDEB]/50">
                  <th className="py-2 px-2">ID</th>
                  <th className="py-2 px-2">Structure Name</th>
                  <th className="py-2 px-2">Classification</th>
                  <th className="py-2 px-2">Structural Change</th>
                  <th className="py-2 px-2">Confidence</th>
                  <th className="py-2 px-2">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7DEDC]/60 font-sans">
                {filteredStructures.map((s) => {
                  const badge = getDamageBadgeStyle(s.damageClass);
                  const isSelected = selectedStructure?.structureId === s.structureId;

                  return (
                    <tr
                      key={s.structureId}
                      onClick={() => setSelectedStructure(s)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#E6EDEB] font-semibold'
                          : 'hover:bg-[#E6EDEB]/40'
                      }`}
                    >
                      <td className="py-2 px-2 font-mono text-[11px] text-[#167F78]">{s.structureId}</td>
