import React, { useState } from 'react';
import {
  X,
  Camera,
  Video,
  Send,
  CheckCircle2,
  WifiOff
} from 'lucide-react';
import { RiskZone, EvidenceCard } from '../../types';
import { DataService } from '../../services/dataService';

interface ReportIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: RiskZone[];
  isOfflineMode: boolean;
  onSubmitSuccess: (newIncident: EvidenceCard, wasOffline: boolean) => void;
}

export const ReportIncidentModal: React.FC<ReportIncidentModalProps> = ({
  isOpen,
  onClose,
  zones,
  isOfflineMode,
  onSubmitSuccess
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id || '');
  const [incidentType, setIncidentType] = useState('Debris Flow');
  const [severity, setSeverity] = useState('SEVERE');
  const [roadBlocked, setRoadBlocked] = useState(true);
  const [hasVideo, setHasVideo] = useState(true);
  const [reporterName, setReporterName] = useState('District Field Officer T. Sangma');
  const [reporterRole, setReporterRole] = useState('DISTRICT_OFFICER');
  const [notes, setNotes] = useState('Active slope tension crack widening rapidly along roadway shoulder.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const currentZone = zones.find(z => z.id === selectedZoneId) || zones[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      location_name: currentZone ? `${currentZone.name}` : 'Sikkim NH-10 Sector',
      state: currentZone?.state || 'Sikkim',
      district: currentZone?.district || 'Pakyong',
      lat: currentZone?.lat || 27.3389,
      lng: currentZone?.lng || 88.6065,
      incident_type: incidentType,
      severity: severity,
      road_blocked: roadBlocked,
      reporter_name: reporterName,
      reporter_role: reporterRole,
      has_video: hasVideo,
      notes: notes
    };

    const res = await DataService.submitIncident(payload);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedSuccess(true);

      setTimeout(() => {
        onSubmitSuccess(res.incident, res.wasQueuedOffline);
        setSubmittedSuccess(false);
        onClose();
      }, 1200);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-[#FAF8F1] border border-[#D7DEDC] rounded-2xl max-w-lg w-full p-5 relative shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#667579] hover:text-[#172126] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-2 border-b border-[#D7DEDC] pb-3 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#167F78]" />
          <div>
            <h2 className="font-semibold text-sm text-[#172126] tracking-wide">
              FIELD INCIDENT & GROUND EVIDENCE REPORT
            </h2>
            {isOfflineMode && (
              <span className="text-[11px] text-[#C58A24] flex items-center mt-0.5 font-mono font-medium">
                <WifiOff className="w-3.5 h-3.5 mr-1" />
                LOW NETWORK MODE: Report will be queued locally in PWA storage.
              </span>
            )}
          </div>
        </div>

        {submittedSuccess ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#167F78] mx-auto animate-bounce" />
            <div className="text-base font-semibold text-[#172126]">
              {isOfflineMode ? 'Incident Stored in Local PWA Queue!' : 'Incident Transmitted & Verified!'}
            </div>
            <p className="text-xs text-[#667579] max-w-sm mx-auto">
              {isOfflineMode
                ? 'Report, GPS coordinates, and media are safely saved offline. Will auto-sync when network reconnects.'
                : 'Geo-tagged evidence sent for simulated vision analysis and satellite SAR correlation.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {/* Sector / Location */}
            <div>
              <label className="block text-[#667579] mb-1 font-semibold text-[11px]">
                TARGET SECTOR / LOCATION:
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-3 py-2 text-[#172126] font-medium focus:border-[#167F78] focus:outline-none cursor-pointer"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.state}: {z.name} (GPS: {z.lat.toFixed(3)}°N, {z.lng.toFixed(3)}°E)
                  </option>
                ))}
              </select>
            </div>

            {/* Incident Types */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#667579] mb-1 font-semibold text-[11px]">INCIDENT TYPE:</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-3 py-2 text-[#172126] focus:border-[#167F78] focus:outline-none cursor-pointer"
                >
                  <option value="CRACK">Crack / Fissure</option>
                  <option value="SLOPE_MOVEMENT">Slope Movement / Slump</option>
                  <option value="ROCKFALL">Rockfall / Debris</option>
                  <option value="LANDSLIDE">Landslide (Mass Failure)</option>
                  <option value="ROAD_BLOCKAGE">Road Blockage</option>
                  <option value="FLOODING">Flooding / Drainage Breach</option>
                  <option value="OTHER">Other Hazard</option>
                </select>
              </div>

              <div>
                <label className="block text-[#667579] mb-1 font-semibold text-[11px]">SEVERITY LEVEL:</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-3 py-2 text-[#172126] focus:border-[#167F78] focus:outline-none cursor-pointer"
                >
                  <option value="CRITICAL">CRITICAL (Total Blockage / Life Threat)</option>
                  <option value="SEVERE">SEVERE (Partial Obstruction)</option>
                  <option value="MODERATE">MODERATE (Precursor Movement)</option>
                  <option value="LOW">LOW (Minor Debris)</option>
                </select>
              </div>
            </div>

            {/* Media Upload Options */}
            <div className="bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC] space-y-2">
              <span className="text-[10px] text-[#667579] font-semibold uppercase block">
                MEDIA ATTACHMENTS (EVIDENCE):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2 bg-[#FAF8F1] p-2 rounded-lg border border-[#D7DEDC]">
                  <Camera className="w-4 h-4 text-[#167F78]" />
                  <span className="text-[#172126] text-[11px] font-medium">Photo Attached (GPS Geo-tag)</span>
                </div>
                <label className="flex items-center space-x-2 bg-[#FAF8F1] p-2 rounded-lg border border-[#D7DEDC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVideo}
                    onChange={(e) => setHasVideo(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#167F78]"
                  />
                  <Video className="w-4 h-4 text-[#C58A24]" />
                  <span className="text-[#172126] text-[11px] font-medium">Attach Video Clip</span>
                </label>
              </div>
            </div>

            {/* Road Blockage Checkbox */}
            <div className="flex items-center space-x-2 bg-[#E6EDEB] p-2.5 rounded-lg border border-[#D7DEDC]">
              <input
                type="checkbox"
                id="roadBlock"
                checked={roadBlocked}
                onChange={(e) => setRoadBlocked(e.target.checked)}
                className="w-4 h-4 rounded text-[#C95050] cursor-pointer"
              />
              <label htmlFor="roadBlock" className="text-[#172126] font-medium cursor-pointer text-[11px]">
                Carriageway / Lifeline Road Blocked (Requires immediate clearance)
              </label>
            </div>

            {/* Reporter Info (Optional for anonymous/citizen) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#667579] mb-1 font-semibold text-[11px]">REPORT SOURCE / ROLE:</label>
                <select
                  value={reporterRole}
                  onChange={(e) => setReporterRole(e.target.value)}
                  className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-3 py-2 text-[#172126] focus:border-[#167F78] focus:outline-none cursor-pointer"
                >
                  <option value="DISTRICT_OFFICER">Field Official (Disaster Officer)</option>
                  <option value="SDRF_COMMANDER">Field Official (SDRF Commander)</option>
                  <option value="PWD_BRO_ENGINEER">Field Official (BRO / PWD Engineer)</option>
                  <option value="COMMUNITY_REPORTER">Citizen / Community Observer</option>
                  <option value="ANONYMOUS_CITIZEN">Anonymous Citizen (No name required)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#667579] mb-1 font-semibold text-[11px]">
                  REPORTER NAME <span className="text-[10px] text-[#667579] font-normal">(Optional)</span>:
                </label>
                <input
                  type="text"
                  placeholder="Optional / Leave blank for anonymous"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-3 py-2 text-[#172126] focus:border-[#167F78] focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[#667579] mb-1 font-semibold text-[11px]">
                OBSERVATION DESCRIPTION:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-[#E6EDEB] border border-[#D7DEDC] rounded-lg px-3 py-2 text-[#172126] focus:border-[#167F78] focus:outline-none"
              />
            </div>

            {/* Submit CTA */}
            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#E6EDEB] border border-[#D7DEDC] text-[#667579] hover:text-[#172126] transition-colors cursor-pointer text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-[#167F78] hover:bg-[#136E68] text-[#FAF8F1] font-semibold text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow-subtle"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'TRANSMITTING...' : isOfflineMode ? 'QUEUE LOCALLY (OFFLINE)' : 'TRANSMIT REPORT'}</span>
              </button>
            </div>
          </form>

        )}
      </div>
    </div>
  );
};



