'use client';

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRoomContext } from "@livekit/components-react"; 

interface StructuredResponsePayload {
  type: string;
  source?: string;
  content: any;
  user_id: string;
  session_id: string;
  timestamp: string;
  system_response?: string;
  voice_instructions?: string;
  is_structured?: boolean;
  chunk_count?: number;
  total_length?: number;
  [key: string]: any;
}

// Custom hook to handle structured data from multiple topics
export function useStructuredData() {
  const [responses, setResponses] = useState<StructuredResponsePayload[]>([]);
  const room = useRoomContext();
  const handlersRegistered = useRef<Set<string>>(new Set());
  console.log(responses)

  useEffect(() => {
    if (!room) return;

    // Generic handler factory for different topics
    const createHandler = (topicName: string) => {
      return async (reader: any, participantInfo: any) => {
        try {
          console.log(`[${topicName}] Received data from:`, participantInfo.identity);

          // Read all the text from the stream
          const jsonString = await reader.readAll();

          if (!jsonString || jsonString.trim().length === 0) {
            console.warn(`[${topicName}] Received empty data`);
            return;
          }

          // Parse the JSON
          const data: StructuredResponsePayload = JSON.parse(jsonString);
          console.log(`[${topicName}] Parsed data:`, data);

          // Add to responses with topic metadata
          setResponses(prev => [...prev, { ...data, _topic: topicName }]);

        } catch (error) {
          console.error(`[${topicName}] Error processing data:`, error);
          if (error instanceof SyntaxError) {
            console.error("Invalid JSON received:");
          }
        }
      };
    };

    // Register handlers for multiple topics
    const topics = [
      'llm-structured-output',    // For structured LLM responses
      'llm-transcription',         // For plain LLM transcriptions
      'transcription',             // For all transcriptions
      'interview-metrics',         // For interview metrics
      'interview-feedback',        // For interview feedback
      'interview-turn-data',       // For turn-by-turn data
    ];

    topics.forEach(topic => {
      if (!handlersRegistered.current.has(topic)) {
        try {
          room.registerTextStreamHandler(topic, createHandler(topic));
          handlersRegistered.current.add(topic);
          console.log(`✓ Registered handler for topic: ${topic}`);
        } catch (error) {
          console.error(`✗ Error registering handler for ${topic}:`, error);
        }
      }
    });

    // Cleanup function
    return () => {
      console.log("Cleaning up text stream handlers");
      handlersRegistered.current.clear();
    };
  }, [room]);

  return { 
    responses, 
    clearResponses: () => setResponses([]),
    latestResponse: responses[responses.length - 1],
  };
}

// Component using the hook
export default function StructuredDataDisplay() {
  const [isVisible, setIsVisible] = useState(true);
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const { responses, clearResponses, latestResponse } = useStructuredData();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new responses arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [responses.length]);

  // Filter responses by topic if filter is set
  const filteredResponses = filterTopic
    ? responses.filter((r: any) => r._topic === filterTopic)
    : responses;

  // Get unique topics from responses
  const uniqueTopics = Array.from(new Set(responses.map((r: any) => r._topic || 'unknown')));

  // Get topic color for visual distinction
  const getTopicColor = (topic: string) => {
    const colors: Record<string, string> = {
      'llm-structured-output': 'text-blue-400',
      'llm-transcription': 'text-green-400',
      'transcription': 'text-purple-400',
      'interview-metrics': 'text-yellow-400',
      'interview-feedback': 'text-pink-400',
      'interview-turn-data': 'text-cyan-400',
    };
    return colors[topic] || 'text-gray-400';
  };

  const getTopicBadgeColor = (topic: string) => {
    const colors: Record<string, string> = {
      'llm-structured-output': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'llm-transcription': 'bg-green-500/20 text-green-400 border-green-500/30',
      'transcription': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'interview-metrics': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'interview-feedback': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'interview-turn-data': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    };
    return colors[topic] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  console.log("Responses received:", responses.length);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed right-8 top-8 w-96 max-h-[80vh] bg-gray-900 rounded-lg shadow-lg z-50 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Structured Data Stream</h2>
            <div className="flex gap-2">
              <button
                onClick={clearResponses}
                className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                title="Clear all responses"
              >
                Clear
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none hover:bg-gray-800 rounded px-2 transition-colors"
                title="Close panel"
              >
                ×
              </button>
            </div>
          </div>

          {/* Topic Filter */}
          {uniqueTopics.length > 1 && (
            <div className="p-3 border-b border-gray-700 bg-gray-800/50">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterTopic(null)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    filterTopic === null
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-gray-700/50 text-gray-400 border-gray-600 hover:bg-gray-700'
                  }`}
                >
                  All ({responses.length})
                </button>
                {uniqueTopics.map(topic => (
                  <button
                    key={topic}
                    onClick={() => setFilterTopic(topic === filterTopic ? null : topic)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      filterTopic === topic
                        ? getTopicBadgeColor(topic)
                        : 'bg-gray-700/50 text-gray-400 border-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {topic.split('-').pop()} ({responses.filter((r: any) => r._topic === topic).length})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredResponses.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                {responses.length === 0 ? (
                  <>
                    <div className="text-4xl mb-2">🎤</div>
                    <div>Waiting for structured data...</div>
                    <div className="text-xs mt-2">
                      Listening on {uniqueTopics.length || 6} topics
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-2">🔍</div>
                    <div>No {filterTopic} messages</div>
                  </>
                )}
              </div>
            ) : (
              filteredResponses.map((response: any, index) => (
                <motion.div
                  key={`${response.session_id}-${response.timestamp}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${getTopicColor(response._topic)}`}>
                        Response #{filteredResponses.length - index}
                      </span>
                      {response._topic && (
                        <span className={`text-xs px-2 py-0.5 rounded border ${getTopicBadgeColor(response._topic)}`}>
                          {response._topic.split('-').pop()}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500 text-xs">
                      {new Date(response.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Type and Source */}
                  {(response.type || response.source) && (
                    <div className="flex gap-2 mb-2 text-xs">
                      {response.type && (
                        <span className="text-gray-400">
                          Type: <span className="text-white">{response.type}</span>
                        </span>
                      )}
                      {response.source && (
                        <span className="text-gray-400">
                          Source: <span className="text-white">{response.source}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Content - handle both string and object */}
                  {response.content && (
                    <div className="mb-2">
                      <div className="text-gray-400 text-xs mb-1">Content:</div>
                      <div className="text-white text-sm">
                        {typeof response.content === 'string' 
                          ? response.content 
                          : JSON.stringify(response.content, null, 2)
                        }
                      </div>
                    </div>
                  )}

                  {/* System Response */}
                  {response.system_response && (
                    <div className="mb-2">
                      <div className="text-gray-400 text-xs mb-1">System Response:</div>
                      <div className="text-white text-sm">
                        {response.system_response}
                      </div>
                    </div>
                  )}

                  {/* Voice Instructions */}
                  {response.voice_instructions && (
                    <div className="mb-2">
                      <div className="text-gray-400 text-xs mb-1">Voice Instructions:</div>
                      <div className="text-green-400 text-sm">
                        {response.voice_instructions}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {(response.chunk_count || response.total_length) && (
                    <div className="text-xs text-gray-500 mb-2">
                      {response.chunk_count && <span>Chunks: {response.chunk_count} </span>}
                      {response.total_length && <span>Length: {response.total_length}</span>}
                    </div>
                  )}

                  {/* Full JSON */}
                  <details className="mt-2">
                    <summary className="text-gray-400 text-xs cursor-pointer hover:text-white">
                      View full JSON
                    </summary>
                    <pre className="text-xs text-gray-300 mt-2 p-2 bg-gray-900 rounded overflow-auto max-h-48">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </details>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer */}
          {responses.length > 0 && (
            <div className="p-3 border-t border-gray-700 bg-gray-800">
              <div className="text-gray-400 text-sm text-center">
                Total responses: {responses.length}
                {filterTopic && ` (${filteredResponses.length} filtered)`}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Floating toggle button when hidden */}
      {!isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsVisible(true)}
          className="fixed right-8 top-8 p-3 bg-gray-900 rounded-lg shadow-lg z-50 text-white hover:bg-gray-800 transition-colors"
          title="Show structured data panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {responses.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {responses.length}
            </span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}