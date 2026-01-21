import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface Note {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  meeting: { title: string };
  author: { name: string };
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ content: '', meetingId: '' });
  const [meetings, setMeetings] = useState<any[]>([]);
  const navigate = useNavigate();

  const fetchNotes = async () => {
    try {
      const [notesRes, meetingsRes] = await Promise.all([
        api.get('/notes'),
        api.get('/meetings')
      ]);
      setNotes(notesRes.data);
      setMeetings(meetingsRes.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleRowClick = (id: string) => {
    navigate(`/notes/${id}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/notes', formData);
      setShowModal(false);
      setFormData({ content: '', meetingId: '' });
      fetchNotes();
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Notes</h1>
          <p className="text-gray-500">All your meeting notes in one place</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          New Note
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <div
            key={note.id}
            onClick={() => handleRowClick(note.id)}
            className="card-hover"
          >
            <div className="flex items-center gap-2 mb-3">
              <DocumentTextIcon className="h-5 w-5 text-primary-600" />
              <span className={`badge-${note.type === 'ai_generated' ? 'info' : 'gray'}`}>
                {note.type === 'ai_generated' ? 'AI Generated' : 'Manual'}
              </span>
            </div>
            <p className="text-gray-900 line-clamp-3">{note.content}</p>
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
              <span>{note.meeting?.title || 'No meeting'}</span>
              <span>{format(new Date(note.createdAt), 'MMM d')}</span>
            </div>
          </div>
        ))}
      </div>

      {notes.length === 0 && (
        <div className="text-center py-12 card">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">No notes yet. Create your first note!</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">New Note</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting</label>
                <select
                  className="input"
                  value={formData.meetingId}
                  onChange={(e) => setFormData({ ...formData, meetingId: e.target.value })}
                  required
                >
                  <option value="">Select a meeting</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  className="input"
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
