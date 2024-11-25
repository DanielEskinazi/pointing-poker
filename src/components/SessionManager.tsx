import { useState } from 'react';
import { Share2, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store';

export function SessionManager() {
  const [showShareLink, setShowShareLink] = useState(false);
  const { sessionId, createSession, joinSession } = useGameStore();

  const handleCreateSession = () => {
    const newSessionId = createSession();
    setShowShareLink(true);
  };

  const handleJoinSession = () => {
    const joinId = prompt('Enter session ID:');
    if (joinId) {
      joinSession(joinId);
    }
  };

  const shareUrl = sessionId ? `${window.location.origin}?session=${sessionId}` : '';

  return (
    <div className="mb-8">
      {!sessionId ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4"
        >
          <button
            onClick={handleCreateSession}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Share2 size={20} />
            Create Session
          </button>
          <button
            onClick={handleJoinSession}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <LinkIcon size={20} />
            Join Session
          </button>
        </motion.div>
      ) : showShareLink ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 bg-blue-50 p-4 rounded-lg"
        >
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 px-3 py-2 border rounded bg-white"
          />
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Copy Link
          </button>
        </motion.div>
      ) : null}
    </div>
  );
}