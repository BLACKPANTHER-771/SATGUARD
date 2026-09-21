
      {/* 3. Main Operational Viewport */}
      <main className={`flex-1 overflow-hidden flex flex-col min-h-0 view-animate ${currentView === 'command_center' || currentView === 'map_3d' || currentView === 'satellite_view' ? 'p-0' : 'p-3'}`}>
        {/* VIEW 1: COMMAND CENTER (Primary Mission Control - OpenWeather Operations Dashboard) */}
        {currentView === 'command_center' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden h-full w-full">
            <OpenWeatherCommandCenter
              zones={displayedZones.length > 0 ? displayedZones : zones}
              selectedZone={activeZone}
              onSelectZone={handleSelectZone}
              selectedState={selectedState}
              onSelectState={handleSelectState}
              metrics={metrics}
              criticalEvents={criticalEvents}
              timeOffset={timeOffset}
              onTimeChange={setTimeOffset}
              onTriggerSOP={() => setCurrentView('response_sop')}
              roads={roads}
              historicalEvents={historicalEvents}
              soilStations={soilStations}
              satelliteObs={satelliteObs}
              alerts={alerts}
              evidenceCards={evidenceCards}
              selectedLanguage={selectedLanguage}
              onSelectLanguage={setSelectedLanguage}
              isOfflineMode={isOfflineMode}
            />
          </div>
        )}

        {/* VIEW 2: EPOCH TRUTH LOOP */}
        {currentView === 'truth_loop' && truthMetrics && (
          <EpochTruthLoopView
            zones={displayedZones.length > 0 ? displayedZones : zones}
            selectedZone={activeZone}
            selectedState={selectedState}
