import React, { useRef, useState} from 'react';
import {
    SafeAreaView,
    View,
    Text,
    Animated,
    PanResponder,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {styles} from './styles';

interface EmojiItem {
    id: number;
    emoji: string;
    label: string;
    position: Animated.ValueXY;
    scale: Animated.Value;
    backgroundColor: Animated.Value;
    isMatched: boolean;
    initialPosition: { x: number; y: number };
}

const EmojiGameScreen: React.FC = () => {
    const [targetPositions, setTargetPositions] = useState<Record<string, { x: number; y: number }>>({});
    const targetRefs = useRef<Record<string, View | null>>({});
    const draggableRefs = useRef<Record<string, View | null>>({});
    const [score, setScore] = useState(0);

    const createAnimatedEmoji = (id: number, label: string, emoji: string): EmojiItem => ({
        id,
        label,
        emoji,
        position: new Animated.ValueXY(),
        scale: new Animated.Value(1),
        backgroundColor: new Animated.Value(0),
        isMatched: false,
        initialPosition: { x: 0, y: 0 }
    });

    const [emojis, setEmojis] = useState([
        createAnimatedEmoji(1, 'star-emoji', '🌟'),
        createAnimatedEmoji(2, 'balloon-emoji', '🎈'),
        createAnimatedEmoji(3, 'platte-emoji', '🎨'),
        createAnimatedEmoji(4, 'guitar-emoji', '🎸'),
        createAnimatedEmoji(5, 'rocket-emoji', '🚀'),
        createAnimatedEmoji(6, 'pizza-emoji', '🍕'),
    ]);

    const measureTargetPosition = (ref: View | null, label: string) => {
        if (ref) {
            ref.measure((x, y, width, height, pageX, pageY) => {
                setTargetPositions(prev => ({
                    ...prev,
                    [label]: {
                        x: pageX + width / 2,
                        y: pageY + height / 2
                    }
                }));
            });
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            Object.entries(targetRefs.current).forEach(([label, ref]) => {
                measureTargetPosition(ref, label);
            });
        }, [])
    );

    const animateSuccess = (emoji: EmojiItem) => {
        Animated.parallel([
            Animated.timing(emoji.backgroundColor, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
            }),
            Animated.spring(emoji.scale, {
                toValue: 1.2,
                useNativeDriver: false,
            }),
            Animated.spring(emoji.position, {
                toValue: {
                    x: emoji.initialPosition.x,
                    y: emoji.initialPosition.y
                },
                useNativeDriver: false,
            })
        ]).start(() => {
            setEmojis(prevEmojis =>
                prevEmojis.map(e =>
                    e.id === emoji.id ? { ...e, isMatched: true } : e
                )
            );

            setTimeout(() => {
                Animated.timing(emoji.backgroundColor, {
                    toValue: 0,
                    useNativeDriver: false,
                }).start();
            }, 250);
        });

        setScore(prevScore => prevScore + 1);
    };

    const createPanResponder = (emoji: EmojiItem) => {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                emoji.position.setValue({ x: 0, y: 0 });
                emoji.scale.setValue(1.1);
            },
            onPanResponderMove: Animated.event(
                [
                    null,
                    { dx: emoji.position.x, dy: emoji.position.y }
                ],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gesture) => {
                emoji.position.flattenOffset();
                const currentPosition = {
                    x: gesture.moveX,
                    y: gesture.moveY
                };

                const targetPosition = targetPositions[emoji.label];
                const tolerance = 50;

                if (targetPosition &&
                    Math.abs(currentPosition.x - targetPosition.x) < tolerance &&
                    Math.abs(currentPosition.y - targetPosition.y) < tolerance) {
                    animateSuccess(emoji);
                } else {
                    Animated.spring(emoji.position, {
                        toValue: emoji.initialPosition,
                        tension: 40,
                        friction: 5,
                        useNativeDriver: false,
                    }).start();
                }
            }
        });
    };

    const interpolateColor = (backgroundColor: Animated.Value) => {
        return backgroundColor.interpolate({
            inputRange: [0, 1],
            outputRange: ['white', '#4CAF50']
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.emojiContainer}>
                <Text style={styles.emojiTitle}>Match the Emojis!</Text>

                <View style={styles.targetContainer}>
                    {[0, 1].map(row => (
                        <View key={row} style={styles.emojiRow}>
                            {emojis.slice(row * 3, (row + 1) * 3).map((emoji) => (
                                <View accessible={true}
                                    testID={`target-${emoji.id}`}
                                    key={`target-${emoji.id}`}
                                    ref={(ref) => {
                                        targetRefs.current[emoji.label] = ref;
                                    }}
                                    style={styles.emojiTarget}
                                >
                                    <Text style={styles.transparentEmoji}>{emoji.emoji}</Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>

                <View style={styles.draggableContainer}>
                    {[0, 1].map(row => (
                        <View key={row} style={styles.emojiRow}>
                            {emojis.slice(row * 3, (row + 1) * 3).map((emoji) => (
                                <Animated.View
                                    testID={`emoji-${emoji.id}`}
                                    key={`emoji-${emoji.id}`}
                                    ref={(ref) => {
                                        draggableRefs.current[emoji.label] = ref as View | null;
                                    }}
                                    style={[
                                        styles.draggableEmoji,
                                        {
                                            transform: [
                                                ...emoji.position.getTranslateTransform(),
                                                { scale: emoji.scale }
                                            ],
                                            backgroundColor: interpolateColor(emoji.backgroundColor),
                                        }
                                    ]}
                                    {...createPanResponder(emoji).panHandlers}
                                >
                                    <Text style={styles.emojiText}>{emoji.emoji}</Text>
                                </Animated.View>
                            ))}
                        </View>
                    ))}
                </View>
                <Text style={styles.scoreText}>Score: {score}</Text>
            </View>
        </SafeAreaView>
    );
};

export default EmojiGameScreen;
