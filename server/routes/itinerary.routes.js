const router=require('express').Router();
const c=require('../controllers/itinerary.controller');
const {requireAuth,allowRoles}=require('../middleware/auth');
router.get('/:packageId/itinerary',c.validId,c.list);
router.post('/:packageId/itinerary',requireAuth,allowRoles('admin'),c.validId,c.create);
router.patch('/:packageId/itinerary/:id',requireAuth,allowRoles('admin'),c.validId,c.update);
router.delete('/:packageId/itinerary/:id',requireAuth,allowRoles('admin'),c.validId,c.remove);
module.exports=router;
