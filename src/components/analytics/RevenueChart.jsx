import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

export default function RevenueChart({ data = [] }) {
  const chartData = data.map((d) => ({
    value: Number(d.sales ?? d.revenue ?? 0),
    label: d.date ? d.date.slice(5) : '',
    dataPointText: '',
  }));

  if (!chartData.length) {
    return (
      <View className="h-[180px] items-center justify-center">
        <Text className="text-gray-400 text-sm">No revenue data</Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden">
      <LineChart
        data={chartData}
        width={width - 80}
        height={160}
        color="#f59e0b"
        thickness={2.5}
        startFillColor="#fef3c7"
        endFillColor="transparent"
        startOpacity={0.6}
        endOpacity={0.1}
        areaChart
        hideDataPoints={false}
        dataPointsColor="#f59e0b"
        dataPointsRadius={3}
        hideRules={false}
        rulesColor="#f3f4f6"
        rulesType="solid"
        yAxisColor="transparent"
        xAxisColor="#e5e7eb"
        yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
        xAxisLabelTextStyle={{ color: '#9ca3af', fontSize: 9 }}
        showXAxisIndices={false}
        noOfSections={4}
        maxValue={Math.max(...chartData.map((d) => d.value)) * 1.2 || 1000}
        curved
        animateOnDataChange
        initialSpacing={10}
        endSpacing={10}
        hideYAxisText={false}
        formatYLabel={(v) => {
          const n = Number(v);
          if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
          if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
          return `₹${n}`;
        }}
      />
    </View>
  );
}
