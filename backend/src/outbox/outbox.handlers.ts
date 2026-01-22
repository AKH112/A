import { Injectable } from '@nestjs/common';

export type OutboxTopicHandler = {
  topic: string;
  handle: (payload: any) => Promise<void>;
};

@Injectable()
export class OutboxHandlers {
  private byTopic = new Map<string, OutboxTopicHandler>();

  register(handler: OutboxTopicHandler) {
    this.byTopic.set(handler.topic, handler);
  }

  get(topic: string) {
    return this.byTopic.get(topic) ?? null;
  }
}

