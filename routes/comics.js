const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const upload = multer({ dest: "uploads/" });
const auth = require('../middleware/auth');

const API_BASE = 'https://comicvine.gamespot.com/api';
const API_KEY = process.env.API_KEY;

router.get('/issue', auth, async (req, res) => {
    const id = req.query.id;
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 100;

    console.log(`[REQUEST] /issue - volume ID: ${id}, offset: ${offset}, limit: ${limit}`);

    if (!id || !/^\d+-\d+$/.test(id)) {
        console.warn(`[WARN] Invalid volume ID format received: ${id}`);
        return res.status(400).json({ error: 'Invalid or missing ID format. Expected digits-digits' });
    }

    try {
        console.log(`[API CALL] Fetching volume metadata for ID: ${id}`);
        const { data } = await axios.get(`${API_BASE}/volume/${id}/`, {
            params: {
                api_key: API_KEY,
                format: 'json',
                field_list: 'issues'
            }
        });

        if (!data.results || !data.results.issues) {
            console.warn(`[WARN] No issues found for volume ID: ${id}`);
            return res.status(404).json({ error: 'No issues found for this volume.' });
        }

        const issues = data.results.issues;
        console.log(`[INFO] Found ${issues.length} issues in volume.`);

        const sorted = [...issues].sort((a, b) => {
            const aNum = parseFloat(a.issue_number);
            const bNum = parseFloat(b.issue_number);
            if (isNaN(aNum)) return 1;
            if (isNaN(bNum)) return -1;
            return aNum - bNum;
        });

        const issueList = [];

        for (let i = offset; i < Math.min(offset + limit, sorted.length); i++) {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            const issue = sorted[i];
            console.log(`[FETCHING] Issue ${i + 1}/${sorted.length} - Number: ${issue.issue_number}`);

            try {
                const { data: issueData } = await axios.get(issue.api_detail_url, {
                    params: {
                        api_key: API_KEY,
                        format: 'json',
                        field_list: 'cover_date,id,image,name,volume,api_detail_url,issue_number,person_credits,first_appearance_characters'
                    }
                });

                const result = issueData.results;
                const transformed = {
                    id: result.id,
                    name: result.name,
                    issue_number: result.issue_number,
                    description: result.description,
                    volume: {
                        id: result.volume?.id,
                        name: result.volume?.name
                    },
                    year: result.cover_date?.slice(0, 4) || null,
                    image_url: result.image?.original_url || null
                };

                issueList.push(transformed);
                console.log(`[OK] Added issue ${transformed.issue_number}: ${transformed.name || 'Unnamed'}`);
            } catch (innerErr) {
                console.error(`[ERROR] Failed to fetch issue data for issue_number=${issue.issue_number}`, innerErr.message);
            }
            await delay(200)
        }

        const moreAvailable = offset + limit < issues.length;
        console.log(`[RESPONSE] Sending ${issueList.length} issues (moreAvailable: ${moreAvailable})`);

        res.json({
            offset,
            limit,
            total: issues.length,
            count: issueList.length,
            moreAvailable,
            results: issueList,
        });
    } catch (err) {
        console.error(`[FATAL] Failed to fetch issues for volume ID ${id}:`, err.message);
        res.status(500).json({ error: 'Failed to fetch issues from volume.' });
    }
});
  

router.get('/search', auth, async (req, res) => {
    const query = req.query.name;
    console.log(query)
    const offset = parseInt(req.query.offset) || 0;

    if (!query || typeof query !== 'string' || query.length < 2 || query.length > 50) {
        console.log('validation error')
        return res.status(400).json({ error: 'Search term must be between 2 and 50 characters.' });
    }

    if (!/^[a-zA-Z0-9\s\-\']+$/.test(query)) {
        console.log('validation error')
        return res.status(400).json({ error: 'Search term contains invalid characters.' });
    }

    const cleanQuery = query.trim().replace(/\s+/g, ' ');
    console.log(cleanQuery)

    try{
        const { data } = await axios.get(`${API_BASE}/volumes`, {
            params: {
            api_key: API_KEY,
            format: 'json',
            offset: offset,
            filter: `name:${cleanQuery}`,
            sort: 'start_date:desc'
            }
        });

        if (!data.results || data.results.length === 0) {
            console.log('error')
            return res.status(404).json({ error: 'No matching volumes found.' });
        }

        console.log(data)

        const moreAvailable = offset + data.number_of_page_results < data.number_of_total_results;
        res.json({
            offset,
            total: data.number_of_total_results,
            count: data.number_of_page_results,
            moreAvailable,
            results: data.results,
        });
    }catch (err){
        console.error(err);
        res.status(500).json({ error: 'Failed to search for volumes.' });
    }
});

router.post("/comic/upload-image", auth, upload.single("file"), async (req, res) => {
  const file = req.file;
  const userId = req.user.userId;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Rename and move file if needed, or upload to cloud storage
  const newPath = path.join("uploads", `${userId}_${Date.now()}_${file.originalname}`);
  fs.rename(file.path, newPath, (err) => {
    if (err) return res.status(500).json({ error: "Failed to save file" });
    res.json({ message: "Image uploaded", path: newPath });
  });
});

module.exports = router;