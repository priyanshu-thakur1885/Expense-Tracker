import React, { useEffect, useRef, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import { Send, Bot, Loader2 } from 'lucide-react';

const AssistantChat = () => {
	const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi! I can help you optimize your expenses. Ask me anything.' }]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const streamRef = useRef(null);

	const sendMessage = async () => {
		if (!input.trim() || loading) return;
		const userMsg = { role: 'user', content: input.trim() };
		setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }]);
		setInput('');
		setLoading(true);

    const token = localStorage.getItem('token');
    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ message: userMsg.content })
    }).then(async (resp) => {
      if (!resp.ok) throw new Error('Request failed');
      if (!resp.body) throw new Error('No stream');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // Server sends lines prefixed with "data: ", strip if present
        const cleaned = chunk.replace(/(^|\n)data:\s?/g, '$1');
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          last.content += cleaned;
          return copy;
        });
      }
    }).catch(() => {
      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: 'Sorry, I had trouble responding.' }]);
    }).finally(() => setLoading(false));
	};

	useEffect(() => () => {
		if (streamRef.current) streamRef.current.close();
	}, []);

	return (
		<ProtectedRoute>
			<div className="p-6 max-w-3xl mx-auto">
				<div className="flex items-center mb-4 space-x-2">
					<Bot className="w-6 h-6 text-green-600" />
					<h1 className="text-xl font-semibold text-gray-900 dark:text-white">AI Assistant</h1>
				</div>
				<div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-[60vh] overflow-y-auto bg-white dark:bg-gray-800">
					{messages.map((m, idx) => (
						<div key={idx} className={`mb-3 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
							<div className={`inline-block px-3 py-2 rounded ${m.role === 'user' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100'}`}>
								{m.content}
							</div>
						</div>
					))}
				</div>
				<div className="mt-4 flex items-center space-x-2">
					<input
						className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
						placeholder="Ask for budgeting tips, insights, or help…"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
					/>
					<button onClick={sendMessage} disabled={loading} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">
						{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
					</button>
				</div>
			</div>
		</ProtectedRoute>
	);
};

export default AssistantChat;


