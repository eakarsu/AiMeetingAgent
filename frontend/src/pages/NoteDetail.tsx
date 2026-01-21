import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import { ArrowLeftIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await api.get(`/notes/${id}`);
        setNote(response.data);
        setContent(response.data.content);
      } catch (error) {
        console.error('Error fetching note:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [id]);

  const handleUpdate = async () => {
    try {
      await api.put(`/notes/${id}`, { content });
      const response = await api.get(`/notes/${id}`);
      setNote(response.data);
      setEditing(false);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await api.delete(`/notes/${id}`);
        navigate('/notes');
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!note) return <div className="text-center py-12">Note not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/notes')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Note Details</h1>
          <p className="text-gray-500">{note.meeting?.title || 'No meeting'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(!editing)} className="btn-secondary flex items-center gap-2">
            <PencilIcon className="h-5 w-5" />
            Edit
          </button>
          <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          {editing ? (
            <div className="space-y-4">
              <textarea
                className="input"
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleUpdate} className="btn-primary flex-1">Save</button>
              </div>
            </div>
          ) : (
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{note.content}</p>
            </div>
          )}
        </div>

        <div className="card h-fit">
          <h2 className="font-semibold text-gray-900 mb-4">Info</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <span className={`badge-${note.type === 'ai_generated' ? 'info' : 'gray'}`}>
                {note.type === 'ai_generated' ? 'AI Generated' : 'Manual'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Author</p>
              <p className="text-gray-900">{note.author?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-gray-900">{format(new Date(note.createdAt), 'MMMM d, yyyy h:mm a')}</p>
            </div>
            {note.meeting && (
              <button
                onClick={() => navigate(`/meetings/${note.meeting.id}`)}
                className="btn-secondary w-full"
              >
                View Meeting
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
