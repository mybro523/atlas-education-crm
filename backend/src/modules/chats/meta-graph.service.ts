import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageChannel } from '@prisma/client';

/**
 * Result of an outbound send attempt through the Meta Graph API.
 * `skipped` = credentials for the channel were not configured (dev / not yet
 * wired) so we did not attempt a network call. `ok` = Graph accepted it.
 * Nothing here ever throws — callers (ChatsService) persist the OUTBOUND
 * message regardless so the operator's reply is never lost.
 */
export interface MetaSendResult {
  ok: boolean;
  skipped: boolean;
  externalId?: string;
  error?: string;
}

/**
 * Thin wrapper over the Meta Graph API for sending WhatsApp Cloud and
 * Instagram Direct messages. Uses Node's global `fetch` (Node 24) — no axios.
 *
 * RESILIENCE: if the relevant channel token is empty we log a warning and
 * return `{ skipped: true }` instead of throwing, so the app boots and the
 * inbox works even before Meta is configured on Railway.
 */
@Injectable()
export class MetaGraphService {
  private readonly logger = new Logger(MetaGraphService.name);
  private readonly graphVersion = 'v21.0';

  constructor(private readonly config: ConfigService) {}

  /**
   * Send a text message out to a contact on the given channel.
   *
   * @param channel      WHATSAPP or INSTAGRAM.
   * @param toExternalId The recipient's external id (WA phone / IG-scoped id).
   * @param text         The message body.
   */
  async sendMessage(
    channel: MessageChannel,
    toExternalId: string,
    text: string,
  ): Promise<MetaSendResult> {
    try {
      if (channel === MessageChannel.WHATSAPP) {
        return await this.sendWhatsApp(toExternalId, text);
      }
      return await this.sendInstagram(toExternalId, text);
    } catch (error) {
      // Network / unexpected failure — log and report, never throw upward.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Meta send failed on ${channel} to ${toExternalId}: ${message}`,
      );
      return { ok: false, skipped: false, error: message };
    }
  }

  /** WhatsApp Cloud API: POST /{phone_number_id}/messages. */
  private async sendWhatsApp(
    toExternalId: string,
    text: string,
  ): Promise<MetaSendResult> {
    const phoneNumberId = this.config.get<string>(
      'meta.whatsappPhoneNumberId',
    );
    const accessToken = this.config.get<string>('meta.whatsappAccessToken');

    if (!phoneNumberId || !accessToken) {
      this.logger.warn(
        'META_WHATSAPP_* not configured — skipping WhatsApp send (no-op).',
      );
      return { ok: false, skipped: true };
    }

    const url = `https://graph.facebook.com/${this.graphVersion}/${phoneNumberId}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toExternalId,
      type: 'text',
      text: { preview_url: false, body: text },
    };

    return this.postToGraph(url, accessToken, body, (json) => {
      const messages = json?.messages as Array<{ id?: string }> | undefined;
      return messages?.[0]?.id;
    });
  }

  /**
   * Instagram Messaging API: POST /{ig_account_id}/messages with a recipient
   * id and a message payload (same shape as Messenger Platform send).
   */
  private async sendInstagram(
    toExternalId: string,
    text: string,
  ): Promise<MetaSendResult> {
    const igAccountId = this.config.get<string>('meta.instagramAccountId');
    const accessToken = this.config.get<string>('meta.instagramAccessToken');

    if (!igAccountId || !accessToken) {
      this.logger.warn(
        'META_INSTAGRAM_* not configured — skipping Instagram send (no-op).',
      );
      return { ok: false, skipped: true };
    }

    const url = `https://graph.facebook.com/${this.graphVersion}/${igAccountId}/messages`;
    const body = {
      recipient: { id: toExternalId },
      message: { text },
    };

    return this.postToGraph(url, accessToken, body, (json) => {
      return (json?.message_id as string | undefined) ?? undefined;
    });
  }

  /**
   * Shared POST helper: sends JSON to the Graph API with a bearer token and
   * extracts the provider message id via `pickExternalId`. Returns a structured
   * result on both success and HTTP error (never throws for a non-2xx).
   */
  private async postToGraph(
    url: string,
    accessToken: string,
    body: unknown,
    pickExternalId: (json: Record<string, unknown>) => string | undefined,
  ): Promise<MetaSendResult> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const json = (await response
      .json()
      .catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const err = json?.error as { message?: string } | undefined;
      const message = err?.message ?? `HTTP ${response.status}`;
      this.logger.error(`Graph API rejected send: ${message}`);
      return { ok: false, skipped: false, error: message };
    }

    return { ok: true, skipped: false, externalId: pickExternalId(json) };
  }
}
