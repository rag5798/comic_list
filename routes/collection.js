const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/Users');

// POST /api/collection/add
router.post('/add', auth, async (req, res) => {
  const userId = req.user.userId;
  const { collectionName, issue } = req.body;

  console.log("BODY:", req.body);
  console.log("Collection Name:", collectionName);
  console.log("Issue:", JSON.stringify(issue, null, 2));

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Properly get the Map entry
    let collection = user.comicCollections.get(collectionName);
    if (!collection) {
      collection = [];
    }

    // Check if issue already exists
    const exists = collection.some(i => i.id === issue.id);
    if (!exists) {
      collection.push(issue);
      user.comicCollections.set(collectionName, collection); // Proper Map update
      await user.save();
      console.log(`✅ Issue ${issue.id} saved to ${collectionName}`);
    } else {
      console.log(`ℹ️ Issue ${issue.id} already exists in ${collectionName}`);
    }

    res.json({ message: 'Issue added to collection' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add issue' });
  }
});

// GET specific collection
router.get('/:collectionName', auth, async (req, res) => {
  const userId = req.user.userId;
  const collectionName = req.params.collectionName;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const collection = user.comicCollections.get(collectionName) || [];
    res.json({ collection });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all collection names
router.get('/', auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const names = Array.from(user.comicCollections.keys());
    res.json({ collections: names });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/collection/create
router.post('/create', auth, async (req, res) => {
  const name = req.body.name?.trim();
  const userId = req.user.userId;

  console.log(`POST /create: userId=${userId}, requestedName="${name}"`);

  if (!name) {
    console.log("❌ Missing collection name in request.");
    return res.status(400).json({ error: "Missing collection name" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ User not found for ID: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    if (user.comicCollections.has(name)) {
      console.log(`⚠️ Collection "${name}" already exists for user: ${user.email}`);
      return res.status(409).json({ error: "Collection already exists" });
    }

    user.comicCollections.set(name, []);
    await user.save();

    console.log(`✅ Collection "${name}" created for user: ${user.email}`);
    res.json({ message: "Collection created", collections: Array.from(user.comicCollections.keys()) });
  } catch (err) {
    console.error("🔥 Error creating collection:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/collection/rename
router.post('/rename', auth, async (req, res) => {
  const { oldName, newName } = req.body;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    if (!user || !user.comicCollections.has(oldName)) {
      return res.status(404).json({ error: "Collection not found" });
    }

    if (user.comicCollections.has(newName)) {
      return res.status(409).json({ error: "New collection name already exists" });
    }

    const oldCollection = user.comicCollections.get(oldName);
    user.comicCollections.set(newName, oldCollection);
    user.comicCollections.delete(oldName);

    await user.save();
    res.json({ message: "Collection renamed", collections: Array.from(user.comicCollections.keys()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/collection/delete
router.post('/delete', auth, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    if (!user || !user.comicCollections.has(name)) {
      return res.status(404).json({ error: "Collection not found" });
    }

    user.comicCollections.delete(name);
    await user.save();

    res.json({ message: "Collection deleted", collections: Array.from(user.comicCollections.keys()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/collection/deleteIssue
router.post("/deleteIssue", auth, async (req, res) => {
  const { issueId, collectionName } = req.body;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    if (!user || !user.comicCollections.has(collectionName)) {
      return res.status(404).json({ error: "Collection not found" });
    }

    const updated = user.comicCollections.get(collectionName).filter(i => i.id !== issueId);
    user.comicCollections.set(collectionName, updated);
    await user.save();

    res.json({ message: "Issue removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
