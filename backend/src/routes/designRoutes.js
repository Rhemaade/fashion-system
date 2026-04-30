const express = require('express');
const router = express.Router();
const designController = require('../controllers/designController');
const auth = require('../middleware/authMiddleware');

router.get('/asset', designController.proxyDesignAsset);
router.get('/catalog', auth, designController.getGarmentCatalog);
router.post('/generate', auth, designController.generateDesign);
router.get('/', auth, designController.getUserDesigns);

module.exports = router;
