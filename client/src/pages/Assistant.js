import React, { useEffect, useState } from 'react';
import { Lightbulb, RefreshCw, ArrowRight } from 'lucide-react';
import { fetchSuggestions } from '../services/aiService';
import ProtectedRoute from '../components/ProtectedRoute';

const AssistantPage = () => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [data, setData] = useState({ totalSpend: 0, suggestions: [] });

	const load = async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetchSuggestions();
			setData({ totalSpend: res.totalSpend || 0, suggestions: res.suggestions || [] });
		} catch (e) {
			setError('Failed to load suggestions');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	return (
		<ProtectedRoute>
			<div className="p-6">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center space-x-2">
						<Lightbulb className="w-6 h-6 text-yellow-500" />
						<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Assistant</h1>
					</div>
					<button onClick={load} className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
						<RefreshCw className="w-4 h-4 mr-2" /> Refresh
					</button>
				</div>

				{loading ? (
					<p className="text-gray-600 dark:text-gray-300">Generating suggestions…</p>
				) : error ? (
					<p className="text-red-600">{error}</p>
				) : (
					<div>
						<p className="text-gray-700 dark:text-gray-300 mb-4">Last 30 days spend: <span className="font-semibold">₹{data.totalSpend.toFixed(2)}</span></p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{data.suggestions.map((s, idx) => (
								<div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
									<h3 className="font-medium text-gray-900 dark:text-white">{s.title}</h3>
									<p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{s.description}</p>
									{s.action && (
										<a href={s.action.path} className="inline-flex items-center text-sm text-green-700 hover:text-green-800 mt-3">
											{s.action.label} <ArrowRight className="w-4 h-4 ml-1" />
										</a>
									)}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</ProtectedRoute>
	);
};

export default AssistantPage;


