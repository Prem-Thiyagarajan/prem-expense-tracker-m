import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useTheme } from '@/theme';

export default function ExpensesScreen() {
  const t = useTheme();
  return (
    <PlaceholderScreen title="Expenses" milestone="Milestone 3" emoji="🧾" accent={t.candy.pink} />
  );
}
