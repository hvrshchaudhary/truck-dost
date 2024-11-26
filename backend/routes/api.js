const express = require('express');
const router = express.Router();

// Sample GET Route
router.get('/data', (req, res) => {
    res.json({ data: 'This is data from the backend API.' });
});

module.exports = router;
