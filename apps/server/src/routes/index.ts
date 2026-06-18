import { Router } from 'express';
import deviceRoutes from './device.routes';
import pairingRoutes from './pairing.routes';
import permissionRoutes from './permission.routes';
import pinRoutes from './pin.routes';

const router = Router();

router.use('/devices', deviceRoutes);
router.use('/pairings', pairingRoutes);
router.use('/pairings', permissionRoutes); // Permission routes nested under pairings
router.use('/pairing', pinRoutes); // PIN-based pairing routes

export default router;
