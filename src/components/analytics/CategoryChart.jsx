import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

const COLORS = ['#f59e0b', '#10b981', '#6366f1'];

export default function CategoryChart({ data = [] }) {
  const chartData = data.map((d, i) => ({
    value: Number(d.revenue ?? d.sales ?? 0),
    label: (d.type ?? d.category ?? '').charAt(0).toUpperCase() + (d.type ?? d.category ?? '').slice(1),
    frontColor: COLORS[i % COLORS.length],
    topLabelComponent: () => (
      <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 2 }}>
        {Number(d.revenue ?? 0) >= 1000
          ? `₹${(Number(d.revenue) / 1000).toFixed(0)}K`
          : `₹${d.revenue ?? 0}`}
      </Text>
    ),
  }));

  if (!chartData.length) {
    return (
      <View className="h-[140px] items-center justify-center">
        <Text className="text-gray-400 text-sm">No category data</Text>
      </View>
    );
  }

  return (
    <BarChart
      data={chartData}
      width={width - 80}
      height={140}
      barWidth={width / (data.length * 2.5)}
      spacing={20}
      noOfSections={3}
      yAxisColor="transparent"
      xAxisColor="#e5e7eb"
      yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
      xAxisLabelTextStyle={{ color: '#6b7280', fontSize: 11, fontWeight: '600' }}
      hideRules={false}
      rulesColor="#f3f4f6"
      barBorderRadius={6}
      showValuesAsTopLabel={false}
      animationDuration={600}
    />
  );
}
