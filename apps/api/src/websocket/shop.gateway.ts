import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaClient } from '@omsp/database';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PRISMA } from '../prisma/prisma.module';
import { PrintingService } from '../printing/printing.service';

interface WsEnvelope {
  type: string;
  payload: Record<string, unknown>;
  timestamp?: string;
  message_id?: string;
}

@WebSocketGateway({
  namespace: '/ws/shop',
  cors: { origin: '*' },
})
@Injectable()
export class ShopGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ShopGateway.name);
  private readonly deviceSockets = new Map<string, string>();
  private readonly socketDevices = new Map<string, string>();

  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    @Inject(forwardRef(() => PrintingService))
    private readonly printing: PrintingService,
  ) {}

  onModuleInit() {
    this.logger.log('WebSocket gateway ready at /ws/shop');
  }

  async handleConnection(client: Socket) {
    const token = (client.handshake.query.device_token as string) ?? '';
    if (!token) {
      client.disconnect();
      return;
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const device = await this.db.device.findUnique({
      where: { tokenHash },
      include: { store: true },
    });

    if (!device || device.status === 'revoked') {
      this.logger.warn('Rejected connection: invalid device token');
      client.disconnect();
      return;
    }

    this.deviceSockets.set(device.id, client.id);
    this.socketDevices.set(client.id, device.id);
    client.data.deviceId = device.id;
    client.data.storeId = device.storeId;

    await this.db.device.update({
      where: { id: device.id },
      data: { lastConnectedAt: new Date(), status: 'connected' },
    });

    this.logger.log(`Device connected: ${device.name} (${device.id})`);
  }

  handleDisconnect(client: Socket) {
    const deviceId = this.socketDevices.get(client.id);
    if (deviceId) {
      this.deviceSockets.delete(deviceId);
      this.socketDevices.delete(client.id);
      this.db.device.update({
        where: { id: deviceId },
        data: { status: 'disconnected' },
      }).catch(() => {});
    }
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsEnvelope,
  ) {
    const deviceId = client.data.deviceId as string;
    if (!deviceId) return;

    switch (data.type) {
      case 'device.hello':
        await this.handleDeviceHello(deviceId, data.payload);
        break;
      case 'device.heartbeat':
        break;
      case 'printer.sync':
        await this.handlePrinterSync(deviceId, data.payload);
        break;
      case 'print.completed':
        await this.printing.handlePrintCompleted(data.payload as {
          print_job_id: string;
          order_id: string;
          pages_printed?: number;
        });
        break;
      case 'print.failed':
        await this.printing.handlePrintFailed(data.payload as {
          print_job_id: string;
          order_id: string;
          reason_code?: string;
          reason_message?: string;
        });
        break;
      case 'ack':
        break;
      default:
        this.logger.debug(`Unhandled message type: ${data.type}`);
    }
  }

  async notifyOrderCreated(orderId: string): Promise<void> {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { items: true, store: true },
    });
    if (!order) return;

    const totalPages = order.items.reduce((s, i) => s + i.pageCount * i.copies, 0);

    this.emitToStore(order.storeId, {
      type: 'order.created',
      payload: {
        order_id: order.id,
        order_number: order.displayNumber,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        payment_status: order.paymentStatus,
        total_baisa: order.totalBaisa,
        item_count: order.items.length,
        total_pages: totalPages,
        summary: `${totalPages} صفحة`,
      },
      timestamp: new Date().toISOString(),
      message_id: crypto.randomUUID(),
    });
  }

  async dispatchPrint(payload: Record<string, unknown>): Promise<boolean> {
    const order = await this.db.order.findUnique({ where: { id: payload.order_id as string } });
    if (!order) return false;

    return this.emitToStore(order.storeId, {
      type: 'print.dispatch',
      payload,
      timestamp: new Date().toISOString(),
      message_id: crypto.randomUUID(),
    });
  }

  private emitToStore(storeId: string, message: WsEnvelope): boolean {
    if (!this.server?.sockets?.sockets) {
      this.logger.warn('WebSocket server not ready; skipping emit');
      return false;
    }

    let sent = false;
    for (const [, socketId] of this.deviceSockets) {
      const client = this.server.sockets.sockets.get(socketId);
      if (client?.data.storeId === storeId) {
        client.emit('message', message);
        sent = true;
      }
    }
    return sent;
  }

  private async handleDeviceHello(deviceId: string, payload: Record<string, unknown>) {
    await this.db.device.update({
      where: { id: deviceId },
      data: {
        appVersion: (payload.app_version as string) ?? null,
        osVersion: (payload.os_version as string) ?? null,
      },
    });

    if (Array.isArray(payload.printers)) {
      await this.handlePrinterSync(deviceId, { printers: payload.printers });
    }
  }

  private async handlePrinterSync(deviceId: string, payload: Record<string, unknown>) {
    const device = await this.db.device.findUnique({ where: { id: deviceId } });
    if (!device) return;

    const printers = (payload.printers as Array<Record<string, unknown>>) ?? [];

    for (const p of printers) {
      const osName = p.os_name as string;
      if (!osName) continue;

      const caps = (p.capabilities as Record<string, unknown>) ?? {};
      const sizes = (caps.paper_sizes as string[]) ?? ['A4'];

      const printerId = this.printerIdFrom(deviceId, osName);

      await this.db.printer.upsert({
        where: { id: printerId },
        create: {
          id: printerId,
          storeId: device.storeId,
          deviceId: device.id,
          osName,
          displayName: (p.display_name as string) ?? osName,
          status: (p.status as 'online' | 'offline') ?? 'online',
          supportsColor: Boolean(caps.supports_color),
          supportsDuplex: Boolean(caps.supports_duplex),
          supportedSizes: sizes as ('A4' | 'A3' | 'A5')[],
          roles: this.inferRoles(Boolean(caps.supports_color), sizes),
          lastSeenAt: new Date(),
        },
        update: {
          status: (p.status as 'online' | 'offline') ?? 'online',
          supportsColor: Boolean(caps.supports_color),
          supportsDuplex: Boolean(caps.supports_duplex),
          supportedSizes: sizes as ('A4' | 'A3' | 'A5')[],
          lastSeenAt: new Date(),
        },
      });
    }
  }

  private inferRoles(supportsColor: boolean, sizes: string[]): string[] {
    const roles: string[] = [];
    for (const size of sizes) {
      const s = size.toLowerCase();
      roles.push(`bw_${s}`);
      if (supportsColor) roles.push(`color_${s}`);
    }
    return roles;
  }

  private printerIdFrom(deviceId: string, osName: string): string {
    const hex = createHash('sha256').update(`${deviceId}:${osName}`).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
}

export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateDeviceToken(): string {
  return randomBytes(32).toString('hex');
}
