import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Link2,
  Link2Off,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  QrCode,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  InlineError,
  Spinner,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import {
  useInitTelegramLink,
  useTelegramStatus,
  useUnlinkTelegram,
  type TelegramLinkInit,
} from '@/entities/telegram';

import { useCopyToClipboard } from '../model/useCopyToClipboard';

/** Build a QR image URL for the deep link (no npm dependency; best-effort). */
function qrUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(
    data,
  )}`;
}

/**
 * "Connect Telegram" settings card. Shows the current link status; lets the user
 * generate a one-time bot deep link (clickable + copyable code + optional QR)
 * and unlink. Available to any authenticated user. Localized, dark-mode ready,
 * responsive (flawless 320-425px).
 */
export function ConnectTelegramCard() {
  const { t } = useTranslation();
  const toast = useToast();

  const statusQuery = useTelegramStatus();
  const initLink = useInitTelegramLink();
  const unlink = useUnlinkTelegram();
  const { copied, copy } = useCopyToClipboard();

  const [link, setLink] = useState<TelegramLinkInit | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  const linked = statusQuery.data?.linked ?? false;

  const generate = () => {
    setQrFailed(false);
    initLink.mutate(undefined, {
      onSuccess: (data) => setLink(data),
      onError: () => toast.error(t('telegram.generateError')),
    });
  };

  const onCopy = async () => {
    if (!link) return;
    const ok = await copy(link.code);
    if (ok) toast.success(t('telegram.codeCopied'));
    else toast.error(t('telegram.copyError'));
  };

  const doUnlink = () => {
    unlink.mutate(undefined, {
      onSuccess: () => {
        setLink(null);
        toast.success(t('telegram.unlinked'));
      },
      onError: () => toast.error(t('telegram.unlinkError')),
    });
    setConfirmUnlink(false);
  };

  return (
    <Card>
      <CardHeader className="mb-4 flex flex-row items-start gap-3 space-y-0">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300"
          aria-hidden
        >
          <Send className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{t('telegram.title')}</CardTitle>
            {!statusQuery.isLoading &&
              (linked ? (
                <Badge variant="success" dot>
                  {t('telegram.statusLinked')}
                </Badge>
              ) : (
                <Badge variant="muted" dot>
                  {t('telegram.statusNotLinked')}
                </Badge>
              ))}
          </div>
          <CardDescription>{t('telegram.subtitle')}</CardDescription>
        </div>
      </CardHeader>

      {statusQuery.isError ? (
        <InlineError message={t('telegram.statusError')} />
      ) : statusQuery.isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-foreground-muted">
          <Spinner className="h-4 w-4" label={t('common.loading')} />
          {t('common.loading')}
        </div>
      ) : linked ? (
        <LinkedView
          onUnlink={() => setConfirmUnlink(true)}
          unlinking={unlink.isPending}
        />
      ) : (
        <UnlinkedView
          link={link}
          generating={initLink.isPending}
          onGenerate={generate}
          onCopy={onCopy}
          copied={copied}
          qrFailed={qrFailed}
          onQrError={() => setQrFailed(true)}
        />
      )}

      <ConfirmDialog
        open={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        onConfirm={doUnlink}
        title={t('telegram.unlinkConfirmTitle')}
        description={t('telegram.unlinkConfirmText')}
        confirmLabel={t('telegram.unlinkAction')}
        confirming={unlink.isPending}
      />
    </Card>
  );
}

/* ----------------------------- Linked state ----------------------------- */

function LinkedView({
  onUnlink,
  unlinking,
}: {
  onUnlink: () => void;
  unlinking: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-foreground">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        <p>{t('telegram.linkedInfo')}</p>
      </div>
      <Button variant="danger" onClick={onUnlink} loading={unlinking}>
        <Link2Off className="h-4 w-4" />
        {t('telegram.unlinkAction')}
      </Button>
    </div>
  );
}

/* ---------------------------- Unlinked state ---------------------------- */

function UnlinkedView({
  link,
  generating,
  onGenerate,
  onCopy,
  copied,
  qrFailed,
  onQrError,
}: {
  link: TelegramLinkInit | null;
  generating: boolean;
  onGenerate: () => void;
  onCopy: () => void;
  copied: boolean;
  qrFailed: boolean;
  onQrError: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Steps */}
      <ol className="space-y-2 text-sm text-foreground-muted">
        <Step index={1}>{t('telegram.step1')}</Step>
        <Step index={2}>{t('telegram.step2')}</Step>
        <Step index={3}>{t('telegram.step3')}</Step>
      </ol>

      {!link ? (
        <Button onClick={onGenerate} loading={generating}>
          <Link2 className="h-4 w-4" />
          {t('telegram.generateAction')}
        </Button>
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-surface-muted/50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* QR (optional / best-effort) */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-[180px] w-[180px] items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-2">
                {qrFailed ? (
                  <div className="flex flex-col items-center gap-1.5 px-2 text-center text-xs text-foreground-muted">
                    <QrCode className="h-6 w-6" aria-hidden />
                    {t('telegram.qrUnavailable')}
                  </div>
                ) : (
                  <img
                    src={qrUrl(link.deepLink)}
                    alt={t('telegram.qrAlt')}
                    width={164}
                    height={164}
                    onError={onQrError}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>
              <span className="text-xs text-foreground-muted">
                {t('telegram.qrHint')}
              </span>
            </div>

            {/* Code + actions */}
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-foreground-muted">
                  {t('telegram.codeLabel')}
                </span>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm tracking-wider text-foreground">
                    {link.code}
                  </code>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={onCopy}
                    aria-label={t('telegram.copyCode')}
                    title={t('telegram.copyCode')}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <a
                href={link.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium',
                  'bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                <ExternalLink className="h-4 w-4" />
                {t('telegram.openBot')}
              </a>

              <button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:underline disabled:opacity-60"
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', generating && 'animate-spin')}
                  aria-hidden
                />
                {t('telegram.regenerate')}
              </button>
            </div>
          </div>

          <p className="text-xs text-foreground-muted">
            {t('telegram.afterStartHint')}
          </p>
        </div>
      )}
    </div>
  );
}

function Step({ index, children }: { index: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700 dark:bg-brand-600/20 dark:text-brand-300">
        {index}
      </span>
      <span className="min-w-0 flex-1 text-foreground">{children}</span>
    </li>
  );
}
