import axios from 'axios';

export async function fetchSuggestions() {
	const response = await axios.get('/api/ai/suggestions');
	return response.data;
}


