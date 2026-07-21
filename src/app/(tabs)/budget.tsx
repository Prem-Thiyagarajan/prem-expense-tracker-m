import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useTheme } from '@/theme';

export default function BudgetScreen() {
  const t = useTheme();
  return (
    <PlaceholderScreen title="Budget" milestone="Milestone 4" emoji="🎯" accent={t.candy.lilac} />
  );
}
