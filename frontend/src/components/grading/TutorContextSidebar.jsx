import React, { useState, useEffect } from 'react';
import gradingService from '../../services/grading.service';

const TutorContextSidebar = ({ studentId }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // EARS[State-driven]: WHEN component mounts with studentId THEN fetch previous notes
    if (studentId) {
      const fetchNotes = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await gradingService.getTutorNotes(studentId);
          if (response.success && response.data) {
            setNotes(response.data.notes || []);
          }
        } catch (err) {
          setError(err.response?.data?.error?.message || 'Failed to load notes.');
        } finally {
          setLoading(false);
        }
      };
      fetchNotes();
    }
  }, [studentId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    // EARS[Event]: WHEN tutor submits new note THEN call addTutorNote API and prepend to list
    try {
      setSubmitting(true);
      setError(null);
      const response = await gradingService.addTutorNote(studentId, newNote.trim());
      if (response.success) {
        const createdNote = response.data.note || { 
          id: response.data.note_id || Date.now(), 
          note: newNote.trim(), 
          created_at: new Date().toISOString() 
        };
        setNotes([createdNote, ...notes]);
        setNewNote('');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add note.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-canvas rounded-4 p-4 h-100 d-flex flex-column">
        <h5 className="mb-4 text-ink fw-bold">Student Context</h5>
        
        {error && (
          <div className="bg-canvas-soft border-start border-4 border-dark text-ink p-3 mb-4 rounded" role="alert" data-testid="sidebar-error">
            <span className="fw-medium">{error}</span>
          </div>
        )}

        <div className="mb-4">
          <form onSubmit={handleAddNote}>
            <label className="form-label fw-bold text-ink">Private Notes</label>
            <textarea
              className="form-control bg-canvas-soft border-0 mb-3 p-3 fw-medium"
              rows="3"
              placeholder="Add a note about this student's performance..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={submitting || !studentId}
              data-testid="input-new-note"
            ></textarea>
            <div className="text-end">
              <button 
                type="submit" 
                className="btn btn-dark rounded-pill px-4 py-2 fw-medium"
                disabled={submitting || !newNote.trim() || !studentId}
                data-testid="btn-add-note"
              >
                {submitting ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </form>
        </div>

        <h6 className="fw-bold text-ink mb-3">Previous Notes</h6>
        <div className="flex-grow-1 overflow-auto" style={{ maxHeight: '400px' }} data-testid="notes-list">
          {loading ? (
            <div className="text-center py-3">
              <div className="text-body fw-medium">Loading...</div>
            </div>
          ) : notes.length > 0 ? (
            notes.map((n) => (
              <div key={n.id} className="p-4 mb-3 bg-canvas-soft rounded-4" data-testid={`note-item-${n.id}`}>
                <p className="mb-2 text-ink fw-medium">{n.note}</p>
                <small className="text-body fw-medium">
                  {new Date(n.created_at).toLocaleString()}
                </small>
              </div>
            ))
          ) : (
            <p className="text-body fw-medium text-center py-3">No previous notes found.</p>
          )}
        </div>
    </div>
  );
};

export default TutorContextSidebar;
