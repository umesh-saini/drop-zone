import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sessionService, permissionService, notificationService } from '../services';
import { Device, Pairing } from '../models';
import * as presence from './presence';

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

    // Join device-specific room (synchronous)
    socket.join(`device:${deviceCode}`);

    // Register in the in-memory presence map
    const wasOffline = presence.addConnection(deviceCode, socket.id);

    // Create session + notify peers (async, fire-and-forget so it doesn't
    // delay event-listener registration and lose early events)
    void (async () => {
      await sessionService.createSession(deviceCode, socket.id);

      // Notify paired devices that THIS device is online (only on first socket)
      if (wasOffline) {
        await notifyPairedDevices(io, deviceCode, 'device:online', { deviceCode });
      }

      // Send THIS device the current online status of its paired devices,
      // so it learns who was already connected before it joined.
      await sendPresenceSnapshot(socket, deviceCode);
    })();

    // --- Event Handlers ---

    // Clipboard sync
    socket.on('clipboard:sync', async (data: { content: string; timestamp: number }) => {
      await handleClipboardSync(io, deviceCode, data);
    });

    // File offer
    socket.on(
      'file:offer',
      async (data: {
        fileId: string;
        toDevice: string;
        fileName: string;
        fileSize: number;
        fileType: string;
        totalChunks: number;
        chunkSize: number;
      }) => {
        const canSend = await checkPairedPermission(deviceCode, data.toDevice, 'file_receive');
        if (!canSend) {
          socket.emit('error', { message: 'File send permission denied', fileId: data.fileId });
          return;
        }

        // Use the sender-provided fileId so both ends reference the same transfer
        io.to(`device:${data.toDevice}`).emit('file:offer', {
          fileId: data.fileId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          totalChunks: data.totalChunks,
          chunkSize: data.chunkSize,
          fromDevice: deviceCode,
          timestamp: Date.now(),
        });

        if (!presence.isOnline(data.toDevice)) {
          await notificationService.sendNotification(
            data.toDevice,
            'Incoming File Transfer',
            `Device ${deviceCode} wants to send you a file: ${data.fileName}`,
            { type: 'file:offer', fileId: data.fileId }
          );
        }
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
      console.log(data)
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

    // PTY Terminal: request from browser to host
    socket.on('pty:request', async (data: { toDevice: string; pairingId: string }) => {
      const canAccess = await checkPairedPermission(deviceCode, data.toDevice, 'terminal_access');
      if (!canAccess) {
        socket.emit('error', { message: 'Terminal access permission denied' });
        return;
      }
      io.to(`device:${data.toDevice}`).emit('pty:request', {
        fromDevice: deviceCode,
        pairingId: data.pairingId,
      });
    });

    // PTY Terminal: data stream (bidirectional relay)
    socket.on('pty:data', (data: { toDevice: string; data: string }) => {
      io.to(`device:${data.toDevice}`).emit('pty:data', {
        fromDevice: deviceCode,
        data: data.data,
      });
    });

    // PTY Terminal: resize event
    socket.on('pty:resize', (data: { toDevice: string; cols: number; rows: number }) => {
      io.to(`device:${data.toDevice}`).emit('pty:resize', {
        fromDevice: deviceCode,
        cols: data.cols,
        rows: data.rows,
      });
    });

    // PTY Terminal: close session
    socket.on('pty:close', (data: { toDevice: string }) => {
      io.to(`device:${data.toDevice}`).emit('pty:close', {
        fromDevice: deviceCode,
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

      // Only mark offline when the device's LAST socket disconnects
      const nowOffline = presence.removeConnection(deviceCode, socket.id);
      if (nowOffline) {
        await notifyPairedDevices(io, deviceCode, 'device:offline', { deviceCode });
      }
    });
  });
}

/**
 * Send the connecting device a snapshot of which of its paired devices
 * are currently online (so it learns who was already connected).
 */
async function sendPresenceSnapshot(socket: Socket, deviceCode: string): Promise<void> {
  const pairings = await Pairing.find({
    $or: [{ deviceACode: deviceCode }, { deviceBCode: deviceCode }],
    status: 'active',
  });

  for (const pairing of pairings) {
    const peer = pairing.deviceACode === deviceCode ? pairing.deviceBCode : pairing.deviceACode;
    if (presence.isOnline(peer)) {
      socket.emit('device:online', { deviceCode: peer });
    }
  }
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

    // The TARGET device owns its clipboard — check whether it accepts
    // incoming clipboard writes from the other device.
    const hasPermission = await permissionService.checkPermission(
      pairing._id.toString(),
      'clipboard_write',
      targetDevice
    );

    if (hasPermission) {
      io.to(`device:${targetDevice}`).emit('clipboard:update', {
        content: data.content,
        fromDevice: fromDeviceCode,
        timestamp: data.timestamp,
        pairingId: pairing._id.toString(),
      });

      if (!presence.isOnline(targetDevice)) {
        await notificationService.sendDataNotification(targetDevice, {
          type: 'clipboard:update',
          encryptedContent: data.content,
          fromDeviceCode: fromDeviceCode,
          pairingId: pairing._id.toString(),
        });
      }
    }
  }
}

/**
 * Check if two devices are paired and the TARGET (owner) device grants
 * the given permission to the other device.
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

  // The target device owns the resource and controls access
  return permissionService.checkPermission(pairing._id.toString(), permissionType as any, toDevice);
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
