import React from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import useDialogStore from '../../store/dialogStore';

export default function GlobalDialog() {
  const { isOpen, title, message, buttons, hideDialog } = useDialogStore();

  if (!isOpen) return null;

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={hideDialog}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
          <View className="p-6">
            {title ? (
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                {title}
              </Text>
            ) : null}
            {message ? (
              <ScrollView className="max-h-60" showsVerticalScrollIndicator={false}>
                <Text className="text-base text-gray-600 text-center leading-6">
                  {message}
                </Text>
              </ScrollView>
            ) : null}
          </View>
          
          <View className={`border-t border-gray-200 ${buttons.length > 2 ? 'flex-col' : 'flex-row'}`}>
            {buttons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';

              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    hideDialog();
                    // setTimeout ensures modal dismiss animation can start on Android
                    if (btn.onPress) setTimeout(btn.onPress, 50);
                  }}
                  className={`p-4 items-center justify-center
                    ${buttons.length > 2 ? 'w-full border-b border-gray-100' : 'flex-1'}
                    ${buttons.length === 2 && index === 0 ? 'border-r border-gray-200' : ''}
                    active:bg-gray-50
                  `}
                >
                  <Text
                    className={`text-base ${
                      isDestructive ? 'text-red-600 font-bold' : isCancel ? 'text-gray-500 font-medium' : 'text-[#6B1A1A] font-bold'
                    }`}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
