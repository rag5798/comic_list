const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');

const API_BASE = 'https://comicvine.gamespot.com/api';
const API_KEY = process.env.API_KEY;

router.get('/volume/:id', auth, async (req, res) => {
    const id = req.params.id;
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 10;
  
    if (!/^\d+-\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid ID format. Expected digits-digits' });
    }
  
    try {
        const { data } = await axios.get(`${API_BASE}/volume/${id}/`, {
            params: {
              api_key: API_KEY,
              format: 'json',
              field_list: 'issues'
            }
        });

        if (!data.results || !data.results.issues) {
            return res.status(404).json({ error: 'No issues found for this volume.' });
        }

        const issues = data.results.issues;

        const paginated = issues.slice(offset, offset + limit);

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const issueList = [];

        for (const issue of paginated) {
            const { data: issueData } = await axios.get(issue.api_detail_url, {
                params: {
                  api_key: API_KEY,
                  format: 'json',
                  field_list: 'cover_date,id,image,name,volume,api_detail_url,issue_number,person_credits,first_appearance_characters'
                }
            });
            issueList.push(issueData.results);

            await delay(1500);
        }

        res.json({
            offset,
            limit,
            total: issues.length,
            results: issueList,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch issues from volume.' });
    }
});
  

router.get('/volume/search', auth, async (req, res) => {
    const query = req.query.name;
    const offset = parseInt(req.query.offset) || 0;

    if (!query || typeof query !== 'string' || query.length < 2 || query.length > 50) {
        return res.status(400).json({ error: 'Search term must be between 2 and 50 characters.' });
    }

    if (!/^[a-zA-Z0-9\s\-\']+$/.test(query)) {
        return res.status(400).json({ error: 'Search term contains invalid characters.' });
    }

    const cleanQuery = query.trim().replace(/\s+/g, ' ');

    try{
        const { data } = await axios.get(`${API_BASE}/volumes`, {
            params: {
            api_key: API_KEY,
            format: 'json',
            offset: offset,
            filter: `name:${encodeURIComponent(cleanQuery)}`,
            sort: 'start_date:desc'
            }
        });

        if (!data.results || data.results.length === 0) {
            return res.status(404).json({ error: 'No matching volumes found.' });
        }

        const moreAvailable = offset + data.number_of_page_results < data.number_of_total_results;

        res.json({
            offset,
            total: data.number_of_total_results,
            count: data.number_of_page_results,
            moreAvailable,
            results: data.results,
        });
    }catch{
        console.error(err);
        res.status(500).json({ error: 'Failed to search for volumes.' });
    }
});

module.exports = router;