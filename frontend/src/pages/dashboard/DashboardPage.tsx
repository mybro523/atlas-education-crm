import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Card, CardDescription, CardTitle } from '@/shared/ui';
import { navItemsForRole, roleLabelKey, ROUTES, ROLES } from '@/shared/config';
import { useSessionStore, selectUser } from '@/entities/session';
import { FounderOverview } from './ui/FounderOverview';

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useSessionStore(selectUser);
  const isFounder = user?.role === ROLES.FOUNDER;

  // Quick links = the role's nav items minus the dashboard itself.
  const quickLinks = navItemsForRole(user?.role).filter(
    (item) => item.to !== ROUTES.dashboard,
  );

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white shadow-sm sm:p-7">
        <p className="text-sm/relaxed text-white/80">
          {t('dashboard.branchNote')}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
          {t('dashboard.welcome', { name: user?.fullName ?? '' })}
        </h1>
        {user && (
          <p className="mt-1 text-sm text-white/90">
            {t('dashboard.roleGreeting', { role: t(roleLabelKey(user.role)) })}
          </p>
        )}
      </div>

      {/* FOUNDER-only analytics overview (other roles skip straight to links). */}
      {isFounder && <FounderOverview />}

      {/* Quick links */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-foreground-muted">
          {t('dashboard.quickLinks')}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map(({ to, labelKey, icon: Icon }) => (
            <Link key={to} to={to} className="group">
              <Card className="flex h-full items-center gap-4 transition-colors hover:border-primary/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">{t(labelKey)}</CardTitle>
                  <CardDescription className="truncate">
                    {t('dashboard.overview')}
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-foreground-muted transition-transform group-hover:translate-x-0.5" />
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
