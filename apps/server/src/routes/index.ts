import { Router } from 'express';
import deviceRoutes from './device.routes';
import pairingRoutes from './pairing.routes';
import permissionRoutes from './permission.routes';

const router = Router();

router.use('/devices', deviceRoutes);
router.use('/pairings', pairingRoutes);
router.use('/pairings', permissionRoutes); // Permission routes nested under pairings

export default router;
