import {
  BarChart3,
  Receipt,
  AlertCircle,
  BookText,
  Banknote,
  type LucideIcon,
} from 'lucide-react';

export type FinanceTab =
  | 'overview'
  | 'payments'
  | 'debts'
  | 'records'
  | 'salaries';

export interface FinanceTabConfig {
  id: FinanceTab;
  labelKey: string;
  icon: LucideIcon;
}

export const FINANCE_TABS: FinanceTabConfig[] = [
  { id: 'overview', labelKey: 'finance.tabs.overview', icon: BarChart3 },
  { id: 'payments', labelKey: 'finance.tabs.payments', icon: Receipt },
  { id: 'debts', labelKey: 'finance.tabs.debts', icon: AlertCircle },
  { id: 'records', labelKey: 'finance.tabs.records', icon: BookText },
  { id: 'salaries', labelKey: 'finance.tabs.salaries', icon: Banknote },
];
