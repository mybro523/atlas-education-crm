import { useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';

import { Button, useToast } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { extractErrorMessage } from '@/shared/api';
import { useSendMessage } from '@/entities/conversation';

export interface ReplyBoxProps {
  conversationId: string;
  /** Disable input (e.g. when the conversation is CLOSED). */
  disabled?: boolean;
  /** Localized hint shown in place of the input when disabled. */
  disabledHint?: string;
  className?: string;
}

/**
 * Message composer for a conversation thread. Sends optimistically (the bubble
 * appears instantly via `useSendMessage`), auto-grows, and supports
 * Enter-to-send / Shift+Enter for a newline. Mobile-first: full-width, safe
 * tap targets.
 */
export function ReplyBox({
  conversationId,
  disabled = false,
  disabledHint,
  className,
}: ReplyBoxProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useSendMessage(conversationId);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !disabled && !sendMessage.isPending;

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const submit = () => {
    if (!canSend) return;
    const value = trimmed;
    setText('');
    // Reset the auto-grown height after clearing.
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    });
    sendMessage.mutate(
      { text: value },
      {
        onError: (err) => {
          // Restore the draft so the user doesn't lose their message.
          setText(value);
          toast.error(extractErrorMessage(err) ?? t('chats.sendError'));
        },
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  if (disabled) {
    return (
      <div
        className={cn(
          'border-t border-border bg-surface px-4 py-3 text-center text-sm text-foreground-muted',
          className,
        )}
      >
        {disabledHint ?? t('chats.replyDisabled')}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-end gap-2 border-t border-border bg-surface p-3',
        className,
      )}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          autoGrow();
        }}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder={t('chats.replyPlaceholder')}
        aria-label={t('chats.replyPlaceholder')}
        className={cn(
          'max-h-40 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground',
          'placeholder:text-foreground-muted',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
        )}
      />
      <Button
        type="button"
        size="icon"
        onClick={submit}
        disabled={!canSend}
        loading={sendMessage.isPending}
        aria-label={t('chats.send')}
        className="shrink-0 rounded-xl"
      >
        {!sendMessage.isPending && <Send className="h-4 w-4" aria-hidden />}
      </Button>
    </div>
  );
}
