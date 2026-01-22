import { Injectable, OnModuleInit } from '@nestjs/common';
import { OutboxHandlers } from '../outbox/outbox.handlers';
import { TelegramUpdate } from './telegram.types';
import { TelegramService } from './telegram.service';

@Injectable()
export class TelegramUpdateHandler implements OnModuleInit {
  static topic = 'telegram.update';

  constructor(
    private handlers: OutboxHandlers,
    private telegram: TelegramService,
  ) {}

  onModuleInit() {
    this.handlers.register({
      topic: TelegramUpdateHandler.topic,
      handle: async (payload: any) => {
        const update = payload?.update as TelegramUpdate | undefined;
        if (!update) return;
        await this.telegram.handleUpdate(update);
      },
    });
  }
}

