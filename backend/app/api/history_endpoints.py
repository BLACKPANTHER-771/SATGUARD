"""
EPOCH Phase 3 - Event History API Endpoints
Provides authoritative CRUD and operational reopening endpoints for disaster event history.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional

from app.models.history_schemas import HistoricalEventRecord
from app.history_engine.history_store import EventHistoryStore

router = APIRouter(prefix="/history", tags=["Event History Engine"])


@router.get("", response_model=List[HistoricalEventRecord])
def list_historical_events(state: Optional[str] = Query(None, description="Filter by state")) -> List[HistoricalEventRecord]:
    """Lists all historical disaster events in persistent storage."""
    return EventHistoryStore.list_events(state)


@router.get("/{event_id}", response_model=HistoricalEventRecord)
def get_historical_event(event_id: str) -> HistoricalEventRecord:
    """Retrieves a single historical disaster event by ID."""
    event = EventHistoryStore.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Historical event '{event_id}' not found.")
    return event


@router.post("", response_model=HistoricalEventRecord)
def save_historical_event(record: HistoricalEventRecord) -> HistoricalEventRecord:
    """Creates or updates a persistent historical disaster event record."""
    try:
        return EventHistoryStore.save_event(record)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save historical event: {str(e)}")


@router.delete("/{event_id}")
def delete_historical_event(event_id: str) -> Dict[str, Any]:
    """Deletes a historical disaster event from persistent storage."""
    success = EventHistoryStore.delete_event(event_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found for deletion.")
    return {"status": "DELETED", "eventId": event_id}


@router.post("/{event_id}/reopen")
def reopen_historical_event(event_id: str) -> Dict[str, Any]:
    """
    Reopens a historical event and restores its assessment and risk state into active operational memory.
    """
    reopened = EventHistoryStore.reopen_event(event_id)
    if not reopened:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found to reopen.")
    return reopened
