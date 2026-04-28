const express = require('express');
const router = express.Router();
const designController = require('../controllers/designController');
const auth = require('../middleware/authMiddleware');

router.post('/generate', auth, designController.generateDesign);
router.get('/', auth, designController.getUserDesigns);

module.exports = router;
