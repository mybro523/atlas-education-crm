import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { PageHeader } from '@/shared/ui';
import { FinanceTabs } from './ui/FinanceTabs';
import { FINANCE_TABS, type FinanceTab } from './model/tabs';
import { OverviewView } from './ui/OverviewView';
import { PaymentsView } from './ui/PaymentsView';
import { DebtsView } from './ui/DebtsView';
import { RecordsView } from './ui/RecordsView';
import { SalariesView } from './ui/SalariesView';

const TAB_IDS = FINANCE_TABS.map((tab) => tab.id);

function isFinanceTab(value: string | null): value is FinanceTab {
  return value != null && (TAB_IDS as string[]).includes(value);
}

/**
 * Founder finance section (API_CONTRACT §12–15, FOUNDER only). Tabbed shell:
 * Overview (analytics), Payments, Debts, Records, Salaries. The active tab is
 * persisted in the URL (?tab=) so it survives reloads and is shareable.
 */
export function FinancePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const active: FinanceTab = isFinanceTab(tabParam) ? tabParam : 'overview';

  const setActive = (tab: FinanceTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div>
      <PageHeader
        title={t('finance.title')}
        description={t('finance.subtitle')}
      />

      <FinanceTabs active={active} onChange={setActive} />

      {active === 'overview' && <OverviewView />}
      {active === 'payments' && <PaymentsView />}
      {active === 'debts' && <DebtsView />}
      {active === 'records' && <RecordsView />}
      {active === 'salaries' && <SalariesView />}
    </div>
  );
}
