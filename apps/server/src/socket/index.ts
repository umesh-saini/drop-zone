import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sessionService, pairingService, permissionService } from '../services';
import { Device, Pairing } from '../models';

interface AuthenticatedSocket extends Socket {
  deviceCode?: string;
}

/**
 * Setup Socket.io event handlers
 */
export function setupSocketHandlers(io: Server): void {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        deviceCode: string;
        deviceId: string;
      };

      const device = await Device.findOne({ deviceCode: decoded.deviceCode });
      if (!device) {
        return next(new Error('Device not found'));
      }

      socket.deviceCode = decoded.deviceCode;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const deviceCode = socket.deviceCode!;
    console.log(`📱 Device connected: ${deviceCode} (socket: ${socket.id})`);

    // Create session
    await sessionService.createSession(deviceCode, socket.id);

    // Join device-specific room
    socket.join(`device:${deviceCode}`);

    // Notify paired devices that this device is online
    await notifyPairedDevices(io, deviceCode, 'device:online', { deviceCode });

    // --- Event Handlers ---

    // Clipboard sync
    socket.on('clipboard:sync', async (data: { content: string; timestamp: number }) => {
      await handleClipboardSync(io, deviceCode, data);
    });

    // File offer
    socket.on(
      'file:offer',
      async (data: { toDevice: string; fileName: string; fileSize: number; fileType: string }) => {
        const canSend = await checkPairedPermission(deviceCode, data.toDevice, 'file_send');
        if (!canSend) {
          socket.emit('error', { message: 'File send permission denied' });
          return;
        }

        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        io.to(`device:${data.toDevice}`).emit('file:offer', {
          fileId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          fromDevice: deviceCode,
          timestamp: Date.now(),
        });

        socket.emit('file:offer:sent', { fileId });
      }
    );

    // File accept/reject
    socket.on('file:accept', (data: { fileId: string; fromDevice: string }) => {
      io.to(`device:${data.fromDevice}`).emit('file:accept', {
        fileId: data.fileId,
        acceptedBy: deviceCode,
      });
    });

    socket.on('file:reject', (data: { fileId: string; fromDevice: string }) => {
      io.to(`device:${data.fromDevice}`).emit('file:reject', {
        fileId: data.fileId,
        rejectedBy: deviceCode,
      });
    });

    // File chunk transfer
    socket.on(
      'file:chunk',
      (data: {
        fileId: string;
        toDevice: string;
        chunkIndex: number;
        totalChunks: number;
        data: string;
      }) => {
        io.to(`device:${data.toDevice}`).emit('file:chunk', {
          fileId: data.fileId,
          chunkIndex: data.chunkIndex,
          totalChunks: data.totalChunks,
          data: data.data,
          fromDevice: deviceCode,
        });
      }
    );

    // File complete
    socket.on('file:complete', (data: { fileId: string; toDevice: string }) => {
      io.to(`device:${data.toDevice}`).emit('file:complete', {
        fileId: data.fileId,
        fromDevice: deviceCode,
      });
    });

    // Pairing request via socket (real-time notification)
    socket.on('pairing:request', async (data: { targetDeviceCode: string }) => {
      io.to(`device:${data.targetDeviceCode}`).emit('pairing:request', {
        fromDevice: deviceCode,
        timestamp: Date.now(),
      });
    });

    // Remote file access: request from browser to source device
    socket.on('remote:request', async (data: { toDevice: string; request: any }) => {
      const canAccess = await checkPairedPermission(deviceCode, data.toDevice, 'file_access_read');
      if (!canAccess) {
        socket.emit('error', { message: 'Remote file access permission denied' });
        return;
      }
      // Relay encrypted request to source device
      io.to(`device:${data.toDevice}`).emit('remote:request', {
        fromDevice: deviceCode,
        request: data.request,
      });
    });

    // Remote file access: response from source device back to browser
    socket.on('remote:response', async (data: { toDevice: string; response: any }) => {
      // Relay response back to requesting device
      io.to(`device:${data.toDevice}`).emit('remote:response', {
        fromDevice: deviceCode,
        response: data.response,
      });
    });

    // Heartbeat / keep alive
    socket.on('heartbeat', async () => {
      await sessionService.updateSessionActivity(deviceCode);
      socket.emit('heartbeat:ack');
    });

    // Disconnect
    socket.on('disconnect', async (reason) => {
      console.log(`📴 Device disconnected: ${deviceCode} (reason: ${reason})`);
      await sessionService.removeSession(socket.id);
      await notifyPairedDevices(io, deviceCode, 'device:offline', { deviceCode });
    });
  });
}

/**
 * Handle clipboard sync — broadcast to all paired devices with permission
 */
async function handleClipboardSync(
  io: Server,
  fromDeviceCode: string,
  data: { content: string; timestamp: number }
): Promise<void> {
  // Get all active pairings for this device
  const pairings = await Pairing.find({
    $or: [{ deviceACode: fromDeviceCode }, { deviceBCode: fromDeviceCode }],
    status: 'active',
  });

  for (const pairing of pairings) {
    const targetDevice =
      pairing.deviceACode === fromDeviceCode ? pairing.deviceBCode : pairing.deviceACode;

    // Check clipboard_write permission (can this device write to the target's clipboard)
    const hasPermission = await permissionService.checkPermission(
      pairing._id.toString(),
      'clipboard_write',
      fromDeviceCode
    );

    if (hasPermission) {
      io.to(`device:${targetDevice}`).emit('clipboard:update', {
        content: data.content,
        fromDevice: fromDeviceCode,
        timestamp: data.timestamp,
        pairingId: pairing._id.toString(),
      });
    }
  }
}

/**
 * Check if two devices are paired and have a specific permission
 */
async function checkPairedPermission(
  fromDevice: string,
  toDevice: string,
  permissionType: string
): Promise<boolean> {
  const [normalA, normalB] =
    fromDevice < toDevice ? [fromDevice, toDevice] : [toDevice, fromDevice];

  const pairing = await Pairing.findOne({
    deviceACode: normalA,
    deviceBCode: normalB,
    status: 'active',
  });

  if (!pairing) return false;

  return permissionService.checkPermission(
    pairing._id.toString(),
    permissionType as any,
    fromDevice
  );
}

/**
 * Notify all paired devices about an event
 */
async function notifyPairedDevices(
  io: Server,
  deviceCode: string,
  event: string,
  data: any
): Promise<void> {
  const pairings = await Pairing.find({
    $or: [{ deviceACode: deviceCode }, { deviceBCode: deviceCode }],
    status: 'active',
  });

  for (const pairing of pairings) {
    const targetDevice =
      pairing.deviceACode === deviceCode ? pairing.deviceBCode : pairing.deviceACode;

    io.to(`device:${targetDevice}`).emit(event, data);
  }
}
