import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Card, CardDescription, CardTitle } from '@/shared/ui';
import { navItemsForRole, roleLabelKey, ROUTES } from '@/shared/config';
import { useSessionStore, selectUser } from '@/entities/session';

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useSessionStore(selectUser);

  // Quick links = the role's nav items minus the dashboard itself.
  const quickLinks = navItemsForRole(user?.role).filter(
    (item) => item.to !== ROUTES.dashboard,
  );

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-elevated sm:p-7">
        <p className="text-sm/relaxed text-white/80">
          {t('dashboard.branchNote')}
        </p>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">
          {t('dashboard.welcome', { name: user?.fullName ?? '' })}
        </h1>
        {user && (
          <p className="mt-1 text-sm text-white/90">
            {t('dashboard.roleGreeting', { role: t(roleLabelKey(user.role)) })}
          </p>
        )}
      </div>

      {/* Quick links */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
          {t('dashboard.quickLinks')}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map(({ to, labelKey, icon: Icon }) => (
            <Link key={to} to={to} className="group">
              <Card className="flex h-full items-center gap-4 transition-shadow hover:shadow-elevated">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-primary dark:bg-brand-950">
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
