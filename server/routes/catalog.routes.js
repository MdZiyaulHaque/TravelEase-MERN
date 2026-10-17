const router=require('express').Router();const c=require('../controllers/catalog.controller');const {requireAuth,allowRoles}=require('../middleware/auth');
// Public catalog; admin may request archived entries with ?all=true.
router.get('/admin/destinations',requireAuth,allowRoles('admin'),c.destinationList);
router.get('/admin/packages',requireAuth,allowRoles('admin'),c.packageList);
router.get('/destinations',c.destinationList);
router.get('/packages',c.packageList);
router.get('/packages/:id',c.validId,c.packageOne);
router.post('/destinations',requireAuth,allowRoles('admin'),c.destinationCreate);
router.patch('/destinations/:id',requireAuth,allowRoles('admin'),c.validId,c.destinationUpdate);
router.delete('/destinations/:id',requireAuth,allowRoles('admin'),c.validId,c.destinationDelete);
router.post('/packages',requireAuth,allowRoles('admin'),c.packageCreate);
router.patch('/packages/:id',requireAuth,allowRoles('admin'),c.validId,c.packageUpdate);
router.delete('/packages/:id',requireAuth,allowRoles('admin'),c.validId,c.packageDelete);
module.exports=router;
