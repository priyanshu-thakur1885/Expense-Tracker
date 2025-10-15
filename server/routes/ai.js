const express = require('express');
const Expense = require('../models/Expense');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Utility helpers to analyze spending
function getCategoryTotals(expenses) {
	const totalsByCategory = {};
	for (const e of expenses) {
		const key = e.category || 'other';
		const prev = totalsByCategory[key] || 0;
		totalsByCategory[key] = prev + e.amount;
	}
	return totalsByCategory;
}

function getDailyTotals(expenses) {
	const totalsByDay = {};
	for (const e of expenses) {
		const day = new Date(e.date).toISOString().slice(0, 10);
		const prev = totalsByDay[day] || 0;
		totalsByDay[day] = prev + e.amount;
	}
	return totalsByDay;
}

function summarize(totals) {
	let topKey = null;
	let topVal = 0;
	for (const [k, v] of Object.entries(totals)) {
		if (v > topVal) {
			topKey = k;
			topVal = v;
		}
	}
	return { key: topKey, value: topVal };
}

// GET /api/ai/suggestions
router.get('/suggestions', authenticateToken, async (req, res) => {
	try {
		// Past 30 days of expenses
		const since = new Date();
		since.setDate(since.getDate() - 30);
		const expenses = await Expense.find({ userId: req.user._id, date: { $gte: since } })
			.sort({ date: -1 })
			.lean();

		const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
		const byCategory = getCategoryTotals(expenses);
		const byDay = getDailyTotals(expenses);
		const topCategory = summarize(byCategory);
		const peakDay = summarize(byDay);
		const numDaysActive = new Set(expenses.map(e => new Date(e.date).toISOString().slice(0, 10))).size || 1;
		const avgPerDay = totalSpend / numDaysActive;

		const suggestions = [];

		if (topCategory.key) {
			suggestions.push({
				title: 'Top spending category',
				description: `You spent the most on ${topCategory.key} (₹${topCategory.value.toFixed(2)}) in the last 30 days. Set a weekly cap for this category to control it.`,
				action: {
					label: 'Set category budget',
					path: '/analytics'
				}
			});
		}

		if (peakDay.key) {
			suggestions.push({
				title: 'Peak spending day',
				description: `Your highest daily spend was on ${peakDay.key} (₹${peakDay.value.toFixed(2)}). Consider planning meals ahead on that day to reduce spikes.`,
				action: {
					label: 'Review expenses',
					path: '/expenses'
				}
			});
		}

		suggestions.push({
			title: 'Daily average',
			description: `You spend an average of ₹${avgPerDay.toFixed(2)} on active days. Try setting a daily limit slightly below this to nudge savings.`,
			action: {
				label: 'Set a budget',
				path: '/analytics'
			}
		});

		// Identify frequent food court
		const byCourt = {};
		for (const e of expenses) {
			const k = e.foodCourt || 'Other';
			byCourt[k] = (byCourt[k] || 0) + 1;
		}
		const courtSummary = summarize(byCourt);
		if (courtSummary.key) {
			suggestions.push({
				title: 'Frequent spot',
				description: `You often buy from ${courtSummary.key}. Check if there are cheaper alternatives or combo deals on days you visit.`,
				action: {
					label: 'View trends',
					path: '/analytics'
				}
			});
		}

		return res.json({ success: true, totalSpend, suggestions });
	} catch (error) {
		console.error('AI suggestions error:', error);
		return res.status(500).json({ success: false, message: 'Failed to generate suggestions' });
	}
});

module.exports = router;


