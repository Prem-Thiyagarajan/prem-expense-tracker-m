import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { MonthProvider } from '@/state/MonthProvider';

export default function TabsLayout() {
  return (
    <MonthProvider>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="trends" />
        <Tabs.Screen name="expenses" />
        <Tabs.Screen name="budget" />
      </Tabs>
    </MonthProvider>
  );
}
