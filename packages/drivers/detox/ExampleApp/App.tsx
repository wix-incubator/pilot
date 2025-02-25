import React from 'react';
import { Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import EmojiGameScreen from './screens/EmojiGameScreen.tsx';
import ColorGameScreen from './screens/ColorGameScreen.tsx';
import AssertionsScreen from './screens/AssertionsScreen.tsx';
import { Home, Palette, TextQuote } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

const App: React.FC = () => {
    return (
        <NavigationContainer>
            <Tab.Navigator>
                <Tab.Screen
                    name="EmojiGame"
                    component={EmojiGameScreen}
                    options={{
                        tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                        title: 'Emoji Game',
                        tabBarButton: (props) => (
                            <Pressable {...props} testID="emoji-game-tab" />
                        )
                    }}
                />
                <Tab.Screen
                    name="ColorGame"
                    component={ColorGameScreen}
                    options={{
                        tabBarIcon: ({ color, size }) => <Palette color={color} size={size} />,
                        title: 'Color Game'
                    }}
                />
                <Tab.Screen
                    name="Assertions"
                    component={AssertionsScreen}
                    options={{
                        tabBarIcon: ({ color, size }) => <TextQuote color={color} size={size} />,
                        title: 'Assertions',
                        tabBarButton: (props) => (
                            <Pressable {...props} testID="assertions-tab" />
                        )
                    }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
};

export default App;
