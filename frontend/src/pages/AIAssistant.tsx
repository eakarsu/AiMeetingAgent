import { useState } from 'react';
import api from '../api/axios';
import { SparklesIcon, PaperAirplaneIcon, DocumentTextIcon, ClipboardDocumentListIcon, FaceSmileIcon, LightBulbIcon, EnvelopeIcon, CalendarIcon } from '@heroicons/react/24/outline';

export default function AIAssistant() {
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { message });
      setResponse(res.data.response);
    } catch (error) {
      setResponse('Error processing request. Please check your OpenRouter API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!transcript.trim()) {
      setResponse('Please enter a transcript or meeting content first.');
      return;
    }
    setLoading(true);
    try {
      let res;
      switch (action) {
        case 'summarize':
          res = await api.post('/ai/summarize', { transcript });
          setResponse(res.data.summary);
          break;
        case 'extract-actions':
          res = await api.post('/ai/extract-actions', { transcript });
          setResponse(JSON.stringify(res.data.actionItems, null, 2));
          break;
        case 'sentiment':
          res = await api.post('/ai/sentiment', { transcript });
          setResponse(JSON.stringify(res.data.sentiment, null, 2));
          break;
        case 'topics':
          res = await api.post('/ai/topics', { transcript });
          setResponse(JSON.stringify(res.data.topics, null, 2));
          break;
        case 'follow-up':
          res = await api.post('/ai/follow-up-email', { meetingTitle: 'Meeting', summary: transcript, actionItems: [] });
          setResponse(res.data.email);
          break;
        case 'suggest-agenda':
          res = await api.post('/ai/suggest-agenda', { meetingTitle: 'Meeting', context: transcript });
          setResponse(JSON.stringify(res.data.suggestions, null, 2));
          break;
      }
    } catch (error) {
      setResponse('Error processing request. Please check your OpenRouter API key.');
    } finally {
      setLoading(false);
    }
  };

  const aiFeatures = [
    { id: 'summarize', name: 'Summarize', icon: DocumentTextIcon, description: 'Generate a concise summary' },
    { id: 'extract-actions', name: 'Extract Actions', icon: ClipboardDocumentListIcon, description: 'Find action items' },
    { id: 'sentiment', name: 'Sentiment', icon: FaceSmileIcon, description: 'Analyze meeting tone' },
    { id: 'topics', name: 'Key Topics', icon: LightBulbIcon, description: 'Extract main topics' },
    { id: 'follow-up', name: 'Follow-up Email', icon: EnvelopeIcon, description: 'Draft follow-up email' },
    { id: 'suggest-agenda', name: 'Suggest Agenda', icon: CalendarIcon, description: 'AI agenda suggestions' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SparklesIcon className="h-7 w-7 text-primary-600" />
          AI Assistant
        </h1>
        <p className="text-gray-500">AI-powered meeting analysis and assistance</p>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 font-medium ${activeTab === 'chat' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('analyze')}
          className={`px-4 py-2 font-medium ${activeTab === 'analyze' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
        >
          Analyze Content
        </button>
      </div>

      {activeTab === 'chat' ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Ask AI Assistant</h2>
            <form onSubmit={handleChat} className="space-y-4">
              <textarea
                className="input"
                rows={6}
                placeholder="Ask me anything about meetings, productivity, or get help with meeting-related tasks..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <><PaperAirplaneIcon className="h-5 w-5" />Send</>
                )}
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Response</h2>
            {response ? (
              <div className="bg-primary-50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-900">{response}</pre>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <SparklesIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>AI response will appear here</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Meeting Content</h2>
            <textarea
              className="input"
              rows={8}
              placeholder="Paste your meeting transcript, notes, or any content you want to analyze..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {aiFeatures.map((feature) => (
              <button
                key={feature.id}
                onClick={() => handleAction(feature.id)}
                disabled={loading}
                className="card-hover text-center py-4"
              >
                <feature.icon className="h-8 w-8 mx-auto text-primary-600 mb-2" />
                <p className="font-medium text-gray-900 text-sm">{feature.name}</p>
                <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
              </button>
            ))}
          </div>

          {loading && (
            <div className="card flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-500">Processing with AI...</span>
            </div>
          )}

          {response && !loading && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-primary-600" />
                AI Result
              </h2>
              <div className="bg-primary-50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-900">{response}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card bg-gradient-to-r from-primary-50 to-purple-50 border-primary-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <SparklesIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Powered by OpenRouter</h3>
            <p className="text-sm text-gray-600 mt-1">
              This AI assistant uses Claude 3.5 Sonnet via OpenRouter. Make sure you have set your OPENROUTER_API_KEY in the .env file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
